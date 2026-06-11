import { config as loadEnv } from "dotenv";
import { runRag } from "@/evals/rag";
import { runAdversarial } from "@/evals/adversarial";
import { runStructure } from "@/evals/structure";
import { type SuiteResult, printSuite } from "@/evals/lib/report";

// Load .env.local so the optional eval_runs write can reach Supabase when run
// via `npm run eval:*` (tsx). All env reads downstream are lazy, so missing
// vars never break the run — the DB write just gets skipped.
loadEnv({ path: ".env.local" });

type SuiteName = "rag" | "adversarial" | "structure" | "all";

const RUNNERS: Record<Exclude<SuiteName, "all">, () => SuiteResult> = {
  rag: runRag,
  adversarial: runAdversarial,
  structure: runStructure,
};

function parseArg(): SuiteName {
  const arg = (process.argv[2] ?? "all").toLowerCase();
  if (arg === "all" || arg in RUNNERS) return arg as SuiteName;
  console.error(`Unknown suite "${arg}". Use: rag | adversarial | structure | all`);
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
  const toRun: Exclude<SuiteName, "all">[] =
    suite === "all" ? ["rag", "adversarial", "structure"] : [suite];

  const results = toRun.map((s) => RUNNERS[s]());
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
