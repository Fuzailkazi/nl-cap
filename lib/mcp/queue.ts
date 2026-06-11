import { serviceClient } from "@/lib/db";
import {
  toolPayloadSchemas,
  type ApprovalRow,
  type ApprovalStatus,
  type EnqueueResult,
  type McpToolName,
} from "@/lib/contracts";

/**
 * The enqueue side of the approval gate. These functions ONLY read/insert
 * rows in `approval_queue` with status 'pending'. They NEVER perform a tool
 * side effect — that happens exclusively in lib/mcp/execute.ts on approval.
 */

const TABLE = "approval_queue";

/** Raw shape of an approval_queue row as returned by Supabase. */
interface ApprovalQueueDbRow {
  id: number;
  tool: McpToolName;
  payload: unknown;
  status: ApprovalStatus;
  result: unknown | null;
  created_at: string;
  decided_at: string | null;
}

/** Map a raw DB row to the contract ApprovalRow shape. */
export function mapRow(row: ApprovalQueueDbRow): ApprovalRow {
  return {
    id: row.id,
    tool: row.tool,
    payload: row.payload,
    status: row.status,
    result: row.result ?? null,
    created_at: row.created_at,
    decided_at: row.decided_at,
  };
}

/**
 * Validate `payload` against the tool's contract schema, then insert a
 * single 'pending' approval_queue row. Returns only the queued action id.
 * No side effect is performed.
 */
export async function enqueue(
  tool: McpToolName,
  payload: unknown,
): Promise<EnqueueResult> {
  // Throws ZodError on invalid input — caller (or eval) sees the validation error.
  const validated = toolPayloadSchemas[tool].parse(payload);

  const db = serviceClient();
  const { data, error } = await db
    .from(TABLE)
    .insert({ tool, payload: validated, status: "pending" })
    .select("id")
    .single();

  if (error) throw new Error(`enqueue failed for tool ${tool}: ${error.message}`);
  if (!data) throw new Error(`enqueue returned no row for tool ${tool}`);

  return { actionId: (data as { id: number }).id };
}

/** List approval_queue rows newest first, optionally filtered by status. */
export async function listActions(status?: ApprovalStatus): Promise<ApprovalRow[]> {
  const db = serviceClient();
  let query = db
    .from(TABLE)
    .select("id, tool, payload, status, result, created_at, decided_at")
    .order("id", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`listActions failed: ${error.message}`);

  return (data as ApprovalQueueDbRow[] | null)?.map(mapRow) ?? [];
}

/** Fetch a single approval_queue row by id, or null if it does not exist. */
export async function getAction(id: number): Promise<ApprovalRow | null> {
  const db = serviceClient();
  const { data, error } = await db
    .from(TABLE)
    .select("id, tool, payload, status, result, created_at, decided_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAction failed for id ${id}: ${error.message}`);
  if (!data) return null;

  return mapRow(data as ApprovalQueueDbRow);
}
