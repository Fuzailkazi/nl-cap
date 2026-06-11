import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGolden } from "@/evals/lib/dataset";
import { type SuiteResult, pass, fail, pending } from "@/evals/lib/report";

/**
 * eval:rag — golden-dataset citation accuracy + faithfulness/relevance.
 *
 * M0 reality: lib/llm/faqAnswer + the ingested corpus don't exist yet, so the
 * answer/citation/judge checks report pending. What runs now: dataset shape
 * (via loadGolden) and a sanity check that every expected citation URL is a
 * real entry in the source manifest (no dangling citations).
 */
export function runRag(): SuiteResult {
  const checks = [];
  const ds = loadGolden(); // shape-validated on load
  checks.push(pass("dataset loads + validates", `${ds.cases.length} golden cases`));

  // Every expected citation must exist in the manifest (catches typos early).
  const manifest = loadManifestUrls();
  const dangling = ds.cases.filter((c) => !manifest.has(c.expected_citation_url));
  if (dangling.length === 0) {
    checks.push(pass("citation URLs exist in manifest", `${ds.cases.length}/${ds.cases.length} resolve`));
  } else {
    checks.push(
      fail(
        "citation URLs exist in manifest",
        `not in manifest: ${dangling.map((c) => c.id).join(", ")}`,
      ),
    );
  }

  // Prompt-dependent checks: deferred to M1.
  checks.push(pending("answer ≤ max_sentences + cites expected URL", "needs lib/llm/faqAnswer (M1)"));
  checks.push(pending("faithfulness ≥ 0.8 (LLM judge)", "needs corpus + faqAnswer (M1)"));
  checks.push(pending("relevance ≥ 0.8 (LLM judge)", "needs corpus + faqAnswer (M1)"));

  return { suite: "rag", checks };
}

function loadManifestUrls(): Set<string> {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "data", "source-manifest.json"), "utf8"),
  ) as { sources: { url: string }[] };
  return new Set(raw.sources.map((s) => s.url));
}
