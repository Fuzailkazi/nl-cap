import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGolden } from "@/evals/lib/dataset";
import { type SuiteResult, pass, fail } from "@/evals/lib/report";
import { retrieve } from "@/lib/rag/retrieve";
import { faqAnswer } from "@/lib/llm/faqAnswer";
import { judgeAnswer } from "@/evals/lib/judge";

/**
 * eval:rag — golden-dataset citation accuracy + faithfulness/relevance.
 * Runs the REAL pipeline (retrieve → faqAnswer). Requires an ingested corpus.
 * The DoD gate is citation accuracy; faithfulness/relevance use the LLM judge.
 */
export async function runRag(): Promise<SuiteResult> {
  const checks = [];
  const ds = loadGolden();
  checks.push(pass("dataset loads + validates", `${ds.cases.length} golden cases`));

  const manifest = loadManifestUrls();
  const dangling = ds.cases.filter((c) => !manifest.has(c.expected_citation_url));
  checks.push(
    dangling.length === 0
      ? pass("citation URLs exist in manifest", `${ds.cases.length}/${ds.cases.length}`)
      : fail("citation URLs exist in manifest", `missing: ${dangling.map((c) => c.id).join(", ")}`),
  );

  let citationsCorrect = 0;
  let containsOk = 0;
  let sentencesOk = 0;
  const faith: number[] = [];
  const rel: number[] = [];
  const wrong: string[] = [];

  for (const c of ds.cases) {
    const hits = await retrieve(c.question, { scheme: c.scheme, topK: 6 });
    const ans = await faqAnswer(c.question, hits);

    const citedRight = ans.kind === "answer" && ans.citationUrl === c.expected_citation_url;
    if (citedRight) citationsCorrect++;
    else wrong.push(`${c.id}(${ans.kind}${ans.citationUrl ? ` →${ans.citationUrl}` : ""})`);

    const text = ans.text.toLowerCase();
    if (c.answer_must_contain.every((t) => text.includes(t.toLowerCase()))) containsOk++;
    if (sentenceCount(ans.text) <= c.max_sentences) sentencesOk++;

    if (ans.kind === "answer") {
      const j = await judgeAnswer(c.question, ans.text, hits);
      faith.push(j.faithfulness);
      rel.push(j.relevance);
    }
  }

  const n = ds.cases.length;
  checks.push(
    citationsCorrect === n
      ? pass("citation accuracy", `${citationsCorrect}/${n} cite the expected source`)
      : fail("citation accuracy", `${citationsCorrect}/${n}; wrong: ${wrong.join(", ")}`),
  );
  checks.push(
    sentencesOk === n
      ? pass("answers ≤ max sentences", `${sentencesOk}/${n}`)
      : fail("answers ≤ max sentences", `${sentencesOk}/${n}`),
  );
  checks.push(
    containsOk === n
      ? pass("answers contain expected terms", `${containsOk}/${n}`)
      : fail("answers contain expected terms", `${containsOk}/${n}`),
  );

  const avgFaith = avg(faith);
  const avgRel = avg(rel);
  checks.push(
    avgFaith >= 0.8
      ? pass("faithfulness ≥ 0.8 (judge)", avgFaith.toFixed(2))
      : fail("faithfulness ≥ 0.8 (judge)", avgFaith.toFixed(2)),
  );
  checks.push(
    avgRel >= 0.8
      ? pass("relevance ≥ 0.8 (judge)", avgRel.toFixed(2))
      : fail("relevance ≥ 0.8 (judge)", avgRel.toFixed(2)),
  );

  return { suite: "rag", checks };
}

function sentenceCount(text: string): number {
  return (text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text]).length;
}
function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function loadManifestUrls(): Set<string> {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "data", "source-manifest.json"), "utf8"),
  ) as { sources: { url: string }[] };
  return new Set(raw.sources.map((s) => s.url));
}
