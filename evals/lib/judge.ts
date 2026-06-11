import { generationClient } from "@/lib/llm/client";
import type { RetrievalHit } from "@/lib/contracts";

/**
 * LLM-as-judge for faithfulness + relevance (the two checks the contract allows
 * to be model-judged). Returns scores in [0,1]. Used by eval:rag.
 */
const JUDGE_SCHEMA = {
  name: "judgement",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      faithfulness: { type: "number" },
      relevance: { type: "number" },
      reason: { type: "string" },
    },
    required: ["faithfulness", "relevance", "reason"],
  },
} as const;

export async function judgeAnswer(
  question: string,
  answer: string,
  hits: RetrievalHit[],
): Promise<{ faithfulness: number; relevance: number; reason: string }> {
  const { client, model } = generationClient();
  const sources = hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.content}`).join("\n\n");
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a strict evaluator. Given a QUESTION, an ANSWER, and the SOURCES the answer was meant to use, score: faithfulness = is every claim in the ANSWER supported by the SOURCES with no fabrication (1.0 fully supported, 0.0 fabricated); relevance = does the ANSWER address the QUESTION (1.0 directly, 0.0 unrelated). Output JSON only.",
      },
      { role: "user", content: `QUESTION: ${question}\n\nANSWER: ${answer}\n\nSOURCES:\n${sources}` },
    ],
    response_format: { type: "json_schema", json_schema: JUDGE_SCHEMA },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { faithfulness: number; relevance: number; reason: string };
  return parsed;
}
