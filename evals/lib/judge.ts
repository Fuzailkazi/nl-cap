import { generationClient } from "@/lib/llm/client";
import type { RetrievalHit } from "@/lib/contracts";

/**
 * LLM-as-judge for the generation-quality dimensions the contract allows to be
 * model-judged: faithfulness, relevance, helpfulness, completeness, plus an
 * unsupported-claim count that drives the hallucination / unsupported-claim
 * rates. Scores are in [0,1]; unsupportedClaims is a non-negative integer.
 * Used by eval:generation.
 */
export interface Judgement {
  faithfulness: number;
  relevance: number;
  helpfulness: number;
  completeness: number;
  unsupportedClaims: number;
  reason: string;
}

const JUDGE_SCHEMA = {
  name: "judgement",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      faithfulness: { type: "number" },
      relevance: { type: "number" },
      helpfulness: { type: "number" },
      completeness: { type: "number" },
      unsupportedClaims: { type: "integer" },
      reason: { type: "string" },
    },
    required: [
      "faithfulness",
      "relevance",
      "helpfulness",
      "completeness",
      "unsupportedClaims",
      "reason",
    ],
  },
} as const;

const JUDGE_SYSTEM = `You are a strict evaluator. Given a QUESTION, an ANSWER, and the SOURCES the answer was meant to use, score each dimension in [0,1] and count unsupported claims:
- faithfulness: is every claim in the ANSWER supported by the SOURCES with no fabrication (1.0 fully supported, 0.0 fabricated).
- relevance: does the ANSWER address the QUESTION (1.0 directly, 0.0 unrelated).
- helpfulness: would this ANSWER actually help the user (1.0 clear and useful, 0.0 useless).
- completeness: does the ANSWER cover what the QUESTION asks given the SOURCES (1.0 complete, 0.0 misses the point). A correct, concise answer is complete — do not penalise brevity.
- unsupportedClaims: the number of distinct factual claims in the ANSWER that are NOT supported by the SOURCES (0 if all supported).
Output JSON only.`;

export async function judgeAnswer(
  question: string,
  answer: string,
  hits: RetrievalHit[],
): Promise<Judgement> {
  const { client, model } = generationClient();
  const sources = hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.content}`).join("\n\n");
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: `QUESTION: ${question}\n\nANSWER: ${answer}\n\nSOURCES:\n${sources}` },
    ],
    response_format: { type: "json_schema", json_schema: JUDGE_SCHEMA },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Judgement;
}
