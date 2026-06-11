import { config } from "dotenv";
import { ingestCorpus } from "@/lib/rag/ingest";

/**
 * CLI entry for corpus ingestion.
 *   npx tsx scripts/ingest.ts        # live: fetch+embed+write corpus
 *   npx tsx scripts/ingest.ts --dry  # dry: fetch+extract+chunk + COUNT only
 */

config({ path: ".env.local" });

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry");

  console.log(`\n=== Corpus ingest (${dryRun ? "DRY RUN — no embeddings, no writes" : "LIVE"}) ===\n`);

  const { inserted, chunks, skipped, perUrl } = await ingestCorpus({ dryRun });

  console.log("Per-URL chunk counts:");
  for (const { url, chunks: c } of perUrl) {
    const flag = c === 0 ? "  (no chunks)" : "";
    console.log(`  ${String(c).padStart(3)}  ${url}${flag}`);
  }

  console.log(`\nTotal chunks: ${chunks}`);
  if (!dryRun) console.log(`Inserted rows: ${inserted}`);

  if (skipped.length > 0) {
    console.log(`\nSkipped (non-200) — ${skipped.length}:`);
    for (const { url, status } of skipped) {
      console.log(`  [${status || "ERR"}]  ${url}`);
    }
  } else {
    console.log("\nSkipped: none — all sources fetched OK.");
  }

  console.log("");
}

main().catch((err) => {
  console.error("Ingest failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
