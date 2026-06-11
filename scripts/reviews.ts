import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { ingestReviews, getReviewInputs } from "@/lib/reviews/ingest";
import { weeklyPulse } from "@/lib/llm/weeklyPulse";
import { feeExplainer } from "@/lib/llm/feeExplainer";
import { refreshCorpus } from "@/lib/rag/refresh";
import { serviceClient } from "@/lib/db";

/**
 * M2 pipeline (run via `npm run reviews`):
 *   1. ingest reviews.csv -> reviews table (PII-scrubbed)
 *   2. weeklyPulse(reviews) -> pulses row
 *   3. feeExplainer() -> refreshCorpus() (flow-A: corpus gets a fee_explainer row)
 */
async function main() {
  console.log("=== M2 Review Intelligence pipeline ===\n");

  const ing = await ingestReviews();
  console.log(`Reviews ingested: ${ing.inserted}${ing.skippedPII.length ? ` (skipped PII: ${ing.skippedPII.join(", ")})` : " (0 PII skipped)"}`);

  const reviews = await getReviewInputs();
  const { pulse, body, wordCount } = await weeklyPulse(reviews);
  const { data, error } = await serviceClient()
    .from("pulses")
    .insert({ top_theme: pulse.topTheme, body, word_count: wordCount })
    .select("id")
    .single();
  if (error) throw new Error(`pulses insert failed: ${error.message}`);
  console.log(`Weekly Pulse written: pulses #${data.id} · top_theme="${pulse.topTheme}" · ${wordCount} words`);

  const explainer = await feeExplainer();
  const { corpusId, citationUrl } = await refreshCorpus(explainer);
  console.log(`Fee Explainer refreshed into corpus: row #${corpusId} · cite=${citationUrl}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
