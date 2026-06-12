"use client";

import { Fragment, useState } from "react";
import { Card } from "@/components/ui";

interface EvalCheck {
  name: string;
  status: "pass" | "fail" | "pending";
  detail?: string;
}
interface SuiteDetail {
  suite: string;
  checks: EvalCheck[];
}
export interface EvalRun {
  suite: string;
  passed: boolean;
  score: number | null;
  created_at: string;
  detail?: { suites?: SuiteDetail[] } | null;
}

const ICON = { pass: "✓", fail: "✗", pending: "·" } as const;
const COLOR = { pass: "text-approved", fail: "text-rejected", pending: "text-muted" } as const;

export function EvalRunsTable({ runs }: { runs: EvalRun[] }) {
  const [open, setOpen] = useState<number | null>(null); // start collapsed; click a row to toggle

  if (runs.length === 0) {
    return (
      <Card>
        <span className="text-sm text-muted">
          No eval runs recorded yet — run <code>npm run eval:all</code>.
        </span>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="p-3 font-medium">Suite</th>
            <th className="p-3 font-medium">Result</th>
            <th className="p-3 font-medium">Pass rate</th>
            <th className="p-3 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r, i) => {
            const suites = r.detail?.suites ?? [];
            const isOpen = open === i && suites.length > 0;
            return (
              <Fragment key={i}>
                <tr
                  className="border-t border-border transition-colors hover:bg-black/5"
                  style={{ cursor: suites.length ? "pointer" : "default" }}
                  onClick={() => suites.length && setOpen(isOpen ? null : i)}
                >
                  <td className="p-3 font-mono">
                    {suites.length ? (isOpen ? "▾ " : "▸ ") : "  "}
                    {r.suite}
                  </td>
                  <td className={`p-3 ${r.passed ? "text-approved" : "text-rejected"}`}>
                    {r.passed ? "passed" : "failed"}
                  </td>
                  <td className="p-3">{r.score === null ? "—" : `${Math.round(r.score * 100)}%`}</td>
                  <td className="p-3 text-right text-muted">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-border bg-bg/40">
                    <td colSpan={4} className="p-3">
                      <div className="space-y-3">
                        {suites.map((s) => (
                          <div key={s.suite}>
                            <div className="label mb-1">{s.suite}</div>
                            <ul className="space-y-1">
                              {s.checks.map((c, j) => (
                                <li key={j} className="flex gap-2 text-xs">
                                  <span className={COLOR[c.status]}>{ICON[c.status]}</span>
                                  <span>{c.name}</span>
                                  {c.detail && <span className="text-muted">— {c.detail}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
