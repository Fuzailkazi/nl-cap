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
// Lenient on shape (some models return "" instead of null for citationUrl, or
// a non-URL placeholder). enforceContract() in lib/llm/faqAnswer is the layer
// that GUARANTEES the real contract (verbatim refusals; an answer must cite a
// retrieved hit URL or it degrades to corpus_miss).
export const faqAnswerSchema = z.object({
  kind: z.enum(["answer", "advice_refusal", "corpus_miss"]),
  text: z.string(),
  citationUrl: z.string().nullable(),
  citationTitle: z.string().nullable(),
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

// ============================================================================
// M2 — Review Intelligence seams (Weekly Pulse + Fee Explainer)
// ============================================================================

/** A review as fed to weeklyPulse (NO PII — review_text is pre-scrubbed). */
export interface ReviewInput {
  scheme: string;
  channel: string;
  rating: number;
  title: string | null;
  text: string;
}

/**
 * Weekly Pulse structured output. The contract body format (assembled below)
 * is: Top Themes / User Quotes (≥1) / Key Observation / Action Ideas (exactly 3),
 * ≤250 words. `topTheme` is the short phrase the voice greeting interpolates (M3).
 */
export const weeklyPulseSchema = z.object({
  topTheme: z.string().min(1),
  topThemes: z.array(z.string().min(1)).min(1),
  quotes: z.array(z.string().min(1)).min(1),
  keyObservation: z.string().min(1),
  actionIdeas: z.array(z.string().min(1)).length(3),
});
export type WeeklyPulse = z.infer<typeof weeklyPulseSchema>;

/** Render a WeeklyPulse to the contracted sectioned body text. */
export function assembleWeeklyPulseBody(p: WeeklyPulse): string {
  const themes = p.topThemes.map((t) => `- ${t}`).join("\n");
  const quotes = p.quotes.map((q) => `- "${q.replace(/^"|"$/g, "")}"`).join("\n");
  const actions = p.actionIdeas.map((a, i) => `${i + 1}. ${a}`).join("\n");
  return `Top Themes\n${themes}\n\nUser Quotes\n${quotes}\n\nKey Observation\n${p.keyObservation}\n\nAction Ideas\n${actions}`;
}

/**
 * Fee Explainer structured output. Contracted content format (assembled below)
 * is: exactly 6 bullets, exactly 2 official source links, ends with
 * "Last checked: YYYY-MM-DD". Inserted into corpus as doc_type='fee_explainer'.
 */
export const feeExplainerSchema = z.object({
  scheme: z.string().nullable(),
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).length(6),
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().url() })).length(2),
  lastChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type FeeExplainer = z.infer<typeof feeExplainerSchema>;

/** Render a FeeExplainer to the contracted content text (ends with the stamp). */
export function assembleFeeExplainerContent(e: FeeExplainer): string {
  const bullets = e.bullets.map((b) => `- ${b}`).join("\n");
  const sources = e.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n");
  return `${e.title}\n\n${bullets}\n\nSources:\n${sources}\n\nLast checked: ${e.lastChecked}`;
}

// ============================================================================
// Cross-cutting — PII detection (reviews ingest, voice scheduler, evals)
// ============================================================================

// PAN, 10-digit phone, email, long digit runs (folio/account).
const PII_PATTERN = /[A-Z]{5}[0-9]{4}[A-Z]|\b\d{10}\b|@[a-z0-9.-]+\.[a-z]{2,}|\b\d{11,16}\b/i;

/** True if `text` appears to contain personal data. Single source of truth. */
export function detectPII(text: string): boolean {
  return PII_PATTERN.test(text);
}

// ============================================================================
// M3 — Voice Scheduler seam
// ============================================================================

/** Canonical booking-code shape: KV- + letter + 3 digits (e.g. KV-B391). */
export const BOOKING_CODE_REGEX = /^KV-[A-Z][0-9]{3}$/;
