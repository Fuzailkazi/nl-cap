import { loadGolden } from "@/evals/lib/dataset";
import { type SuiteResult, type Check, pass, fail } from "@/evals/lib/report";
import { retrieve } from "@/lib/rag/retrieve";
import type { RetrievalHit } from "@/lib/contracts";
import { mean, meanRecallAtK, hitRate, mrr, rankedFirst } from "@/evals/lib/metrics";

/**
 * eval:retrieval — RAG retrieval quality over the golden dataset.
 *
 * Relevance is keyed off expected_citation_url (durable; corpus row ids change
 * on re-ingest). Two notions of "relevant":
 *   - GOLD doc: the retrieved chunk whose canonical URL == expected_citation_url
 *     → drives Recall@K, MRR, expected-chunk-retrieved, ranking correctness.
 *   - ANSWER-BEARING chunk: content contains every answer_must_contain term
 *     → drives context precision / context recall.
 *
 * NOTE (honest caveat): with 5 single-answer cases, Recall@3/@5 and hit rate sit
 * near ceiling — the metric machinery is real, discrimination is limited by
 * dataset size. Grow golden.json to make these numbers bite.
 */

const TOP_K = 5;

/** Same scheme-page normalisation eval:rag uses (Direct/Regular are one source). */
const canon = (u: string | null | undefined) => (u ?? "").replace(/\/(direct|regular)\/?$/, "");

interface CaseResult {
  id: string;
  rank: number | null; // 1-based rank of the gold doc, null if absent
  goldId: number | null; // resolved corpus id of the gold doc when retrieved
  retrievedTotal: number;
  answerBearing: number; // retrieved chunks containing all must-contain terms
  contextRecallMet: boolean; // union of retrieved chunks covers all terms
}

function scoreCase(
  hits: RetrievalHit[],
  expectedUrl: string,
  mustContain: string[],
): Omit<CaseResult, "id"> {
  const target = canon(expectedUrl);
  const goldIdx = hits.findIndex((h) => canon(h.url) === target);
  const rank = goldIdx >= 0 ? goldIdx + 1 : null;

  const terms = mustContain.map((t) => t.toLowerCase());
  const bears = (text: string) => terms.every((t) => text.toLowerCase().includes(t));
  const answerBearing = hits.filter((h) => bears(h.content)).length;
  const union = hits.map((h) => h.content).join("\n").toLowerCase();
  const contextRecallMet = terms.every((t) => union.includes(t));

  return {
    rank,
    goldId: goldIdx >= 0 ? hits[goldIdx].id : null,
    retrievedTotal: hits.length,
    answerBearing,
    contextRecallMet,
  };
}

export async function runRetrieval(): Promise<SuiteResult> {
  const checks: Check[] = [];
  const ds = loadGolden();
  checks.push(pass("dataset loads + validates", `${ds.cases.length} golden cases`));

  const results: CaseResult[] = [];
  for (const c of ds.cases) {
    const hits = await retrieve(c.question, { scheme: c.scheme, topK: TOP_K });
    results.push({ id: c.id, ...scoreCase(hits, c.expected_citation_url, c.answer_must_contain) });
  }

  const ranks = results.map((r) => r.rank);
  const missing = results.filter((r) => r.rank === null).map((r) => r.id);

  const rate = hitRate(ranks, TOP_K);
  const r1 = meanRecallAtK(ranks, 1);
  const r3 = meanRecallAtK(ranks, 3);
  const r5 = meanRecallAtK(ranks, 5);
  const mrrScore = mrr(ranks);
  const rankCorrect = mean(results.map((r) => rankedFirst(r.rank)));
  const ctxPrecision = mean(results.map((r) => (r.retrievedTotal ? r.answerBearing / r.retrievedTotal : 0)));
  const ctxRecall = mean(results.map((r) => (r.contextRecallMet ? 1 : 0)));

  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const gate = (name: string, value: number, min: number, detail: string): Check =>
    value + 1e-9 >= min ? pass(name, detail) : fail(name, detail);

  checks.push(gate("retrieval hit rate", rate, 1, `${pct(rate)} (gold doc within top-${TOP_K})`));
  checks.push(gate("Recall@1", r1, 0.8, pct(r1)));
  checks.push(gate("Recall@3", r3, 1, pct(r3)));
  checks.push(gate("Recall@5", r5, 1, pct(r5)));
  checks.push(gate("MRR", mrrScore, 0.9, mrrScore.toFixed(3)));
  checks.push(
    gate(
      "expected chunk retrieved",
      rate,
      1,
      missing.length ? `missing: ${missing.join(", ")}` : `all ${ds.cases.length} gold docs retrieved`,
    ),
  );
  checks.push(gate("chunk ranking correctness", rankCorrect, 0.8, `${pct(rankCorrect)} gold ranked #1`));
  checks.push(gate("context recall", ctxRecall, 1, `${pct(ctxRecall)} of cases fully covered by retrieved set`));
  // Report-only: with a single gold label, max precision is 1/topK — informative, not gated.
  checks.push(
    pass("context precision (report-only)", `${ctxPrecision.toFixed(3)} — single-label ceiling ≈ ${(1 / TOP_K).toFixed(2)}`),
  );

  return { suite: "retrieval", checks };
}
