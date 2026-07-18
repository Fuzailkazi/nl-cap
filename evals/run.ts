import { config as loadEnv } from "dotenv";
import { runRetrieval } from "@/evals/retrieval";
import { runGeneration } from "@/evals/generation";
import { runCompliance } from "@/evals/compliance";
import { runInjection } from "@/evals/injection";
import { runStructure } from "@/evals/structure";
import { type SuiteResult, printSuite } from "@/evals/lib/report";

// Load .env.local so the optional eval_runs write can reach Supabase when run
// via `npm run eval:*` (tsx). All env reads downstream are lazy, so missing
// vars never break the run — the DB write just gets skipped.
loadEnv({ path: ".env.local" });

type Suite = "retrieval" | "generation" | "compliance" | "injection" | "structure";
type SuiteName = Suite | "all";

const RUNNERS: Record<Suite, () => Promise<SuiteResult>> = {
  retrieval: runRetrieval,
  generation: runGeneration,
  compliance: runCompliance,
  injection: runInjection,
  structure: runStructure,
};

// Back-compat aliases so old commands/docs keep working after the suite split.
const ALIASES: Record<string, Suite> = { rag: "generation", adversarial: "compliance" };

const ALL_ORDER: Suite[] = ["retrieval", "generation", "compliance", "injection", "structure"];

function parseArg(): SuiteName {
  const raw = (process.argv[2] ?? "all").toLowerCase();
  const arg: string = ALIASES[raw] ?? raw;
  if (arg === "all" || arg in RUNNERS) return arg as SuiteName;
  console.error(`Unknown suite "${raw}". Use: ${ALL_ORDER.join(" | ")} | all`);
  process.exit(2);
}

/** Best-effort: record the run in eval_runs. Never fails the eval itself. */
async function recordRun(suite: SuiteName, results: SuiteResult[]): Promise<void> {
  try {
    const { serviceClient } = await import("@/lib/db");
    const allChecks = results.flatMap((r) => r.checks);
    const t = allChecks.reduce(
      (acc, c) => ((acc[c.status]++), acc),
      { pass: 0, fail: 0, pending: 0 },
    );
    const runnable = t.pass + t.fail;
    const { error } = await serviceClient()
      .from("eval_runs")
      .insert({
        suite,
        passed: t.fail === 0,
        score: runnable > 0 ? t.pass / runnable : null,
        detail: { counts: t, suites: results.map((r) => ({ suite: r.suite, checks: r.checks })) },
      });
    if (error) console.warn(`  (eval_runs not written: ${error.message})`);
    else console.log(`  (recorded run in eval_runs)`);
  } catch (e) {
    console.warn(`  (eval_runs not written: ${(e as Error).message.split("\n")[0]})`);
  }
}

async function main() {
  const suite = parseArg();
  const toRun: Suite[] = suite === "all" ? ALL_ORDER : [suite];

  const results: SuiteResult[] = [];
  for (const s of toRun) results.push(await RUNNERS[s]());
  let allOk = true;
  for (const r of results) allOk = printSuite(r) && allOk;

  await recordRun(suite, results);

  const grand = results.flatMap((r) => r.checks);
  const t = grand.reduce((a, c) => ((a[c.status]++), a), { pass: 0, fail: 0, pending: 0 });
  console.log(
    `\n=== ${suite.toUpperCase()}: ${allOk ? "PASS" : "FAIL"} — ${t.pass} passed, ${t.fail} failed, ${t.pending} pending ===`,
  );
  process.exit(allOk ? 0 : 1);
}

void main();
