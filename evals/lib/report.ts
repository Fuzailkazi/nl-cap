/** Shared result types + console reporting for all eval suites. */

export type CheckStatus = "pass" | "fail" | "pending";

export interface Check {
  name: string;
  status: CheckStatus;
  detail?: string;
}

export interface SuiteResult {
  suite: string;
  checks: Check[];
}

export const pass = (name: string, detail?: string): Check => ({ name, status: "pass", detail });
export const fail = (name: string, detail?: string): Check => ({ name, status: "fail", detail });
export const pending = (name: string, detail?: string): Check => ({
  name,
  status: "pending",
  detail,
});

const ICON: Record<CheckStatus, string> = { pass: "✓", fail: "✗", pending: "·" };

export function suitePassed(result: SuiteResult): boolean {
  return !result.checks.some((c) => c.status === "fail");
}

export function counts(result: SuiteResult) {
  const tally = { pass: 0, fail: 0, pending: 0 };
  for (const c of result.checks) tally[c.status]++;
  return tally;
}

/** Print one suite's checks + a one-line summary. Returns whether it passed. */
export function printSuite(result: SuiteResult): boolean {
  console.log(`\n[${result.suite}]`);
  for (const c of result.checks) {
    const tag = c.status === "pending" ? " (pending)" : "";
    console.log(`  ${ICON[c.status]} ${c.name}${tag}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  const t = counts(result);
  const ok = suitePassed(result);
  console.log(
    `  → ${ok ? "PASS" : "FAIL"}: ${t.pass} passed, ${t.fail} failed, ${t.pending} pending`,
  );
  return ok;
}
