/**
 * Pure ranking / retrieval-quality metrics. No I/O, no LLM — importable and
 * unit-testable. Each function takes plain numbers so the suites stay thin.
 *
 * Rank convention: a 1-based rank of the GOLD (expected) document within the
 * ranked hit list, or `null` when the gold doc was not retrieved at all.
 */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** 1 if the gold doc is within the top-K, else 0 (0 when not found). */
export function recallAtK(rank: number | null, k: number): number {
  return rank !== null && rank <= k ? 1 : 0;
}

/** Mean Recall@K across cases. */
export function meanRecallAtK(ranks: (number | null)[], k: number): number {
  return mean(ranks.map((r) => recallAtK(r, k)));
}

/** Hit rate = Recall over the full retrieved window (K = topK). */
export function hitRate(ranks: (number | null)[], k: number): number {
  return meanRecallAtK(ranks, k);
}

/** Reciprocal rank for one case (0 when the gold doc is absent). */
export function reciprocalRank(rank: number | null): number {
  return rank !== null && rank > 0 ? 1 / rank : 0;
}

/** Mean Reciprocal Rank across cases. */
export function mrr(ranks: (number | null)[]): number {
  return mean(ranks.map(reciprocalRank));
}

/**
 * Ranking correctness for a single-gold setup: 1 when the gold doc is ranked
 * strictly above every non-relevant chunk (i.e. it sits at rank 1).
 */
export function rankedFirst(rank: number | null): number {
  return rank === 1 ? 1 : 0;
}
