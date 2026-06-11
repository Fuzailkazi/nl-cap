import { serviceClient } from "@/lib/db";
import { getAction } from "@/lib/mcp/queue";
import {
  calendarHoldCreatePayload,
  emailDraftGeneratePayload,
  notesDocAppendPayload,
  type ApprovalRow,
} from "@/lib/contracts";

/**
 * The execute side of the approval gate. Side-effect tables (mcp_notes_docs,
 * calendar_holds, email_drafts) are written ONLY here, ONLY after a human
 * approves a pending action. There is no auto-approve path anywhere.
 */

const QUEUE = "approval_queue";

/** Result jsonb on a successful side effect. */
interface OkResult {
  ok: true;
  table: string;
  sideEffectId: number;
}

/** Result jsonb when the side-effect insert failed (action stays 'approved'). */
interface ErrResult {
  ok: false;
  error: string;
}

/** Result jsonb on rejection — no side effect. */
interface RejectedResult {
  ok: false;
  rejected: true;
}

type ExecResult = OkResult | ErrResult | RejectedResult;

/** Re-fetch a row after mutation; the row is guaranteed to exist here. */
async function reload(id: number): Promise<ApprovalRow> {
  const row = await getAction(id);
  if (!row) throw new Error(`approval_queue row ${id} disappeared after update`);
  return row;
}

/**
 * Perform the tool's side effect by inserting into its side-effect table.
 * Returns the new side-effect row id. The payload is re-validated against the
 * contract schema so a tampered queue row can never reach a raw insert.
 */
async function performSideEffect(
  id: number,
  tool: ApprovalRow["tool"],
  payload: unknown,
): Promise<OkResult> {
  const db = serviceClient();

  switch (tool) {
    case "notes_doc_append": {
      const { content } = notesDocAppendPayload.parse(payload);
      const { data, error } = await db
        .from("mcp_notes_docs")
        .insert({ action_id: id, content })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, table: "mcp_notes_docs", sideEffectId: (data as { id: number }).id };
    }
    case "calendar_hold_create": {
      const { slot, title } = calendarHoldCreatePayload.parse(payload);
      const { data, error } = await db
        .from("calendar_holds")
        .insert({ action_id: id, slot, title: title ?? null })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, table: "calendar_holds", sideEffectId: (data as { id: number }).id };
    }
    case "email_draft_generate": {
      const { subject, body } = emailDraftGeneratePayload.parse(payload);
      const { data, error } = await db
        .from("email_drafts")
        .insert({ action_id: id, subject, body })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, table: "email_drafts", sideEffectId: (data as { id: number }).id };
    }
    default: {
      // Exhaustiveness guard — McpToolName is a closed enum.
      const _never: never = tool;
      throw new Error(`unknown tool: ${String(_never)}`);
    }
  }
}

/** Persist status + decided_at + result on the queue row. */
async function decide(
  id: number,
  status: "approved" | "rejected",
  result: ExecResult,
): Promise<void> {
  const db = serviceClient();
  const { error } = await db
    .from(QUEUE)
    .update({ status, decided_at: new Date().toISOString(), result })
    .eq("id", id);
  if (error) throw new Error(`failed to persist decision for action ${id}: ${error.message}`);
}

/**
 * Approve a pending action: flip status to 'approved', stamp decided_at, then
 * perform the matching side effect. On side-effect failure the action STAYS
 * 'approved' but result records { ok:false, error } (no partial write — each
 * side effect is a single insert).
 */
export async function approveAction(id: number): Promise<ApprovalRow> {
  const row = await getAction(id);
  if (!row) throw new Error(`approval_queue row ${id} not found`);
  if (row.status !== "pending") {
    throw new Error(`cannot approve action ${id}: status is '${row.status}', expected 'pending'`);
  }

  let result: ExecResult;
  try {
    result = await performSideEffect(id, row.tool, row.payload);
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Action is approved regardless; result distinguishes success from a failed side effect.
  await decide(id, "approved", result);
  return reload(id);
}

/**
 * Reject a pending action: flip status to 'rejected', stamp decided_at, record
 * { ok:false, rejected:true }. No side-effect table is ever written.
 */
export async function rejectAction(id: number): Promise<ApprovalRow> {
  const row = await getAction(id);
  if (!row) throw new Error(`approval_queue row ${id} not found`);
  if (row.status !== "pending") {
    throw new Error(`cannot reject action ${id}: status is '${row.status}', expected 'pending'`);
  }

  await decide(id, "rejected", { ok: false, rejected: true });
  return reload(id);
}
