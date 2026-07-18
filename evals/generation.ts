import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGolden, loadAdversarial } from "@/evals/lib/dataset";
import { type SuiteResult, type Check, pass, fail } from "@/evals/lib/report";
import { retrieve } from "@/lib/rag/retrieve";
import { faqAnswer } from "@/lib/llm/faqAnswer";
import { judgeAnswer } from "@/evals/lib/judge";
import { hasExactlyOneCitation } from "@/evals/lib/compliance-checks";
import { mean } from "@/evals/lib/metrics";
import { CORPUS_MISS } from "@/lib/contracts";

/**
 * eval:generation — answer-quality metrics over the REAL retrieve→faqAnswer
 * pipeline. Judge dimensions (faithfulness/relevance/helpfulness/completeness +
 * unsupported-claim count) are the only model-judged checks; everything else is
 * rule-based. Corpus-miss accuracy reuses the adversarial out_of_scope cases.
 */

const canon = (u: string | null) => (u ?? "").replace(/\/(direct|regular)\/?$/, "");

export async function runGeneration(): Promise<SuiteResult> {
  const checks: Check[] = [];
  const ds = loadGolden();
  checks.push(pass("dataset loads + validates", `${ds.cases.length} golden cases`));

  const manifest = loadManifestUrls();

  let citationCorrect = 0;
  let citationValid = 0;
  let citationCoverageOk = 0;
  let answers = 0;
  const faith: number[] = [];
  const rel: number[] = [];
  const help: number[] = [];
  const comp: number[] = [];
  const unsupported: number[] = [];
  let hallucinated = 0;
  const wrongCite: string[] = [];

  for (const c of ds.cases) {
    const hits = await retrieve(c.question, { scheme: c.scheme, topK: 6 });
    const ans = await faqAnswer(c.question, hits);

    if (ans.kind === "answer") {
      answers++;
      if (hasExactlyOneCitation(ans)) citationCoverageOk++;
      if (ans.citationUrl && manifest.has(ans.citationUrl)) citationValid++;
      if (canon(ans.citationUrl) === canon(c.expected_citation_url)) citationCorrect++;
      else wrongCite.push(`${c.id}→${ans.citationUrl ?? "none"}`);

      const j = await judgeAnswer(c.question, ans.text, hits);
      faith.push(j.faithfulness);
      rel.push(j.relevance);
      help.push(j.helpfulness);
      comp.push(j.completeness);
      unsupported.push(j.unsupportedClaims);
      if (j.unsupportedClaims > 0 || j.faithfulness < 0.8) hallucinated++;
    } else {
      wrongCite.push(`${c.id}(${ans.kind})`);
    }
  }

  const n = ds.cases.length;
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const gateScore = (name: string, v: number, min: number): Check =>
    v + 1e-9 >= min ? pass(name, v.toFixed(2)) : fail(name, v.toFixed(2));
  const gateCount = (name: string, ok: number, total: number): Check =>
    ok === total ? pass(name, `${ok}/${total}`) : fail(name, `${ok}/${total}`);

  // --- citation family ---
  checks.push(
    citationCorrect === n
      ? pass("citation accuracy", `${citationCorrect}/${n} cite the expected source`)
      : fail("citation accuracy", `${citationCorrect}/${n}; wrong: ${wrongCite.join(", ")}`),
  );
  checks.push(gateCount("citation validity (in manifest)", citationValid, answers));
  checks.push(gateCount("citation coverage (exactly one)", citationCoverageOk, answers));

  // --- judge family ---
  checks.push(gateScore("faithfulness (judge)", mean(faith), 0.8));
  checks.push(gateScore("relevance (judge)", mean(rel), 0.8));
  checks.push(gateScore("helpfulness (judge)", mean(help), 0.8));
  checks.push(gateScore("completeness (judge)", mean(comp), 0.8));

  const hallucinationRate = answers ? hallucinated / answers : 0;
  const unsupportedRate = mean(unsupported);
  checks.push(
    hallucinationRate <= 1e-9
      ? pass("hallucination rate", "0%")
      : fail("hallucination rate", `${pct(hallucinationRate)} (${hallucinated}/${answers})`),
  );
  checks.push(pass("unsupported claim rate (report-only)", `${unsupportedRate.toFixed(2)} claims/answer`));

  // --- corpus-miss accuracy (reuse adversarial out_of_scope cases) ---
  await checkCorpusMissAccuracy(checks);

  return { suite: "generation", checks };
}

/** Out-of-scope questions must return the verbatim CORPUS_MISS string. */
async function checkCorpusMissAccuracy(checks: Check[]): Promise<void> {
  const adv = loadAdversarial();
  const cases = adv.cases.filter((c) => c.category === "out_of_scope");
  if (!cases.length) return;
  let correct = 0;
  const wrong: string[] = [];
  for (const c of cases) {
    const hits = await retrieve(c.question, { topK: 6 });
    const ans = await faqAnswer(c.question, hits);
    if (ans.text === CORPUS_MISS) correct++;
    else wrong.push(`${c.id}(${ans.kind})`);
  }
  checks.push(
    correct === cases.length
      ? pass("corpus-miss accuracy", `${correct}/${cases.length} out-of-scope → verbatim corpus miss`)
      : fail("corpus-miss accuracy", `${correct}/${cases.length}; wrong: ${wrong.join(", ")}`),
  );
}

function loadManifestUrls(): Set<string> {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "data", "source-manifest.json"), "utf8"),
  ) as { sources: { url: string }[] };
  return new Set(raw.sources.map((s) => s.url));
}
