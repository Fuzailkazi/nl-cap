import {
  type FaqAnswer,
  type RetrievalHit,
  faqAnswerSchema,
  ADVICE_REFUSAL,
  CORPUS_MISS,
} from "@/lib/contracts";
import { generationClient } from "@/lib/llm/client";

/**
 * Pillar 1 — FAQ RAG answer.
 *
 * Compliance is enforced in TWO layers:
 *  1. The prompt instructs the model to classify + answer within the rules.
 *  2. Server-side post-processing GUARANTEES the contract regardless of model
 *     drift: refusals are forced to the verbatim strings, and an "answer" must
 *     cite exactly one URL drawn from the retrieved hits (else it degrades to a
 *     corpus-miss). This is why evals can match on exact strings.
 *
 * The prompt is a NAMED export so evals import the exact production prompt.
 */
export const FAQ_SYSTEM_PROMPT = `You are a mutual-fund SUPPORT assistant for HDFC Mutual Fund. You answer FACTUAL questions about schemes using ONLY the provided sources. You are not a financial advisor.

Classify every question into exactly one "kind":

1. "advice_refusal" — the user asks for investment advice, a recommendation, a prediction, what they "should" buy/sell, or which fund is "better"/"best". Do NOT answer. Return kind "advice_refusal".

2. "corpus_miss" — the question is factual but the provided sources do NOT contain a verified answer (e.g. a different AMC/fund not in scope, or no source covers it). Do NOT guess or use outside knowledge. Return kind "corpus_miss".

3. "answer" — the provided sources DO contain the answer. Write a factual reply of AT MOST 3 sentences. No performance claims, no opinions, no advice. Include exactly ONE citation: set citationUrl + citationTitle to the single most relevant source you used (must be one of the provided sources).

Hard rules:
- Never reveal or repeat any personal data (PII).
- Never fabricate. If unsure whether a source supports the answer, choose "corpus_miss".
- For "advice_refusal" and "corpus_miss", leave citationUrl and citationTitle null (the system supplies the exact user-facing wording).

Respond ONLY with the structured JSON object.`;

/** JSON schema for OpenAI structured outputs (strict). Mirrors faqAnswerSchema. */
const RESPONSE_JSON_SCHEMA = {
  name: "faq_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["answer", "advice_refusal", "corpus_miss"] },
      text: { type: "string" },
      citationUrl: { type: ["string", "null"] },
      citationTitle: { type: ["string", "null"] },
    },
    required: ["kind", "text", "citationUrl", "citationTitle"],
  },
} as const;

function buildUserMessage(question: string, hits: RetrievalHit[]): string {
  const sources =
    hits.length === 0
      ? "(no sources retrieved)"
      : hits
          .map(
            (h, i) =>
              `[Source ${i + 1}] title="${h.title}" url="${h.url ?? ""}" scheme="${h.scheme ?? "general"}"\n${h.content}`,
          )
          .join("\n\n");
  return `Question: ${question}\n\nProvided sources:\n${sources}`;
}

/** One model call → parsed candidate (or null if JSON/parse fails). */
async function callOnce(question: string, hits: RetrievalHit[]): Promise<FaqAnswer | null> {
  const { client, model } = generationClient();
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: FAQ_SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(question, hits) },
    ],
    response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
    temperature: 0,
  });
  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = faqAnswerSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Generate a compliant FAQ answer. Zod-validate → retry once → surface error.
 * Then force the contract server-side.
 */
export async function faqAnswer(question: string, hits: RetrievalHit[]): Promise<FaqAnswer> {
  let candidate = await callOnce(question, hits);
  if (!candidate) candidate = await callOnce(question, hits); // retry once
  if (!candidate) {
    throw new Error("faqAnswer: model returned invalid output twice (schema validation failed)");
  }
  return enforceContract(candidate, hits);
}

/** Guarantee the compliance contract no matter what the model returned. */
export function enforceContract(candidate: FaqAnswer, hits: RetrievalHit[]): FaqAnswer {
  if (candidate.kind === "advice_refusal") {
    return { kind: "advice_refusal", text: ADVICE_REFUSAL, citationUrl: null, citationTitle: null };
  }
  if (candidate.kind === "corpus_miss") {
    return { kind: "corpus_miss", text: CORPUS_MISS, citationUrl: null, citationTitle: null };
  }
  // kind === "answer": the citation MUST be one of the retrieved hit URLs.
  const cited = hits.find((h) => h.url && h.url === candidate.citationUrl);
  if (!cited || !candidate.text.trim()) {
    // No valid grounded citation → we cannot stand behind it. Degrade to miss.
    return { kind: "corpus_miss", text: CORPUS_MISS, citationUrl: null, citationTitle: null };
  }
  return {
    kind: "answer",
    text: clampSentences(candidate.text.trim(), 3),
    citationUrl: cited.url,
    citationTitle: candidate.citationTitle ?? cited.title,
  };
}

/** Keep at most `max` sentences (compliance: FAQ answers are ≤3 sentences). */
function clampSentences(text: string, max: number): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!parts || parts.length <= max) return text;
  return parts.slice(0, max).join("").trim();
}
