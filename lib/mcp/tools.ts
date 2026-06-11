import { enqueue } from "@/lib/mcp/queue";
import type { EnqueueResult } from "@/lib/contracts";

/**
 * Enqueue-only tool builders. These are thin, typed wrappers over `enqueue`:
 * each constructs the tool payload and queues a 'pending' approval_queue row,
 * returning only the action id. They perform NO side effect — approval in
 * lib/mcp/execute.ts is the sole path to a side effect.
 *
 * Compliance: never pass PII through these payloads (no names, emails, phone
 * numbers). The voice/UI layers must deflect volunteered PII before calling.
 */

/** Queue an append to the shared notes doc. */
export function notesDocAppend(content: string): Promise<EnqueueResult> {
  return enqueue("notes_doc_append", { content });
}

/** Queue a calendar hold for a mock slot, with an optional title. */
export function calendarHoldCreate(slot: string, title?: string): Promise<EnqueueResult> {
  return enqueue("calendar_hold_create", { slot, title });
}

/** Queue an email draft (subject + body) for human review. */
export function emailDraftGenerate(subject: string, body: string): Promise<EnqueueResult> {
  return enqueue("email_draft_generate", { subject, body });
}
