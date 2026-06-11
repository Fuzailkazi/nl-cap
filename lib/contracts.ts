import { z } from "zod";

/**
 * M1 shared seams. Every pillar imports types/schemas from here so parallel
 * work builds against ONE fixed interface (no drift). Main-thread owned —
 * rag-engineer, mcp-orchestrator, the UI, and lib/llm all depend on it.
 */

// ============================================================================
// RAG retrieval seam (implemented by lib/rag, consumed by lib/llm/faqAnswer)
// ============================================================================

export interface RetrievalHit {
  id: number;
  docType: string;
  scheme: string | null;
  title: string;
  url: string | null;
  content: string;
  /** cosine similarity in [0,1]; higher = closer. */
  similarity: number;
}

export interface RetrieveOptions {
  /** number of hits to return (default 5). */
  topK?: number;
  /** restrict to a single scheme when set. */
  scheme?: string | null;
}

/** Signature lib/rag/retrieve.ts must implement. */
export type RetrieveFn = (query: string, opts?: RetrieveOptions) => Promise<RetrievalHit[]>;

// ============================================================================
// FAQ answer seam (produced by lib/llm/faqAnswer, rendered by the FAQ UI)
// ============================================================================

/**
 * faqAnswer always returns one of three kinds. Compliance is structural:
 * - "answer": ≤3 sentences, EXACTLY ONE citation (citationUrl + citationTitle set)
 * - "advice_refusal": text === ADVICE_REFUSAL, no citation
 * - "corpus_miss":   text === CORPUS_MISS,    no citation
 */
export const faqAnswerSchema = z
  .object({
    kind: z.enum(["answer", "advice_refusal", "corpus_miss"]),
    text: z.string().min(1),
    citationUrl: z.string().url().nullable(),
    citationTitle: z.string().nullable(),
  })
  .refine((a) => (a.kind === "answer" ? a.citationUrl !== null : a.citationUrl === null), {
    message: "answer kind requires exactly one citation; refusals must have none",
  });
export type FaqAnswer = z.infer<typeof faqAnswerSchema>;

/** Verbatim refusal strings — the single source of truth in code (mirror CLAUDE.md). */
export const ADVICE_REFUSAL =
  "I can't provide investment advice or recommendations. For unbiased investor education, please visit AMFI: https://www.amfiindia.com/";
export const CORPUS_MISS =
  "I don't have a verified source for that yet. Would you like to book a call with an advisor who can help?";
export const PII_DEFLECTION =
  "For your security, please don't share personal details on this call. You can submit them safely through the secure link in your booking confirmation.";

// ============================================================================
// MCP / Approval-gate seam (implemented by lib/mcp, consumed by app + faqAnswer)
// ============================================================================

export const McpToolName = z.enum([
  "notes_doc_append",
  "calendar_hold_create",
  "email_draft_generate",
]);
export type McpToolName = z.infer<typeof McpToolName>;

export const notesDocAppendPayload = z.object({ content: z.string().min(1) });
export const calendarHoldCreatePayload = z.object({
  slot: z.string().min(1),
  title: z.string().optional(),
});
export const emailDraftGeneratePayload = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

/** Map each tool to its payload schema (for validation at enqueue time). */
export const toolPayloadSchemas = {
  notes_doc_append: notesDocAppendPayload,
  calendar_hold_create: calendarHoldCreatePayload,
  email_draft_generate: emailDraftGeneratePayload,
} as const;

export const ApprovalStatus = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

/** A row of approval_queue as returned to the UI. */
export interface ApprovalRow {
  id: number;
  tool: McpToolName;
  payload: unknown;
  status: ApprovalStatus;
  result: unknown | null;
  created_at: string;
  decided_at: string | null;
}

/** Every MCP tool call returns just the queued action id (never a side effect). */
export interface EnqueueResult {
  actionId: number;
}
