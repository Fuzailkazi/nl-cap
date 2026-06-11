import { Card } from "@/components/ui";

export interface EvalRun {
  suite: string;
  passed: boolean;
  score: number | null;
  created_at: string;
}

export function EvalRunsTable({ runs }: { runs: EvalRun[] }) {
  return (
    <Card>
      {runs.length === 0 ? (
        <span className="text-sm text-muted">
          No eval runs recorded yet — run <code>npm run eval:all</code>.
        </span>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="pb-2 font-medium">Suite</th>
              <th className="pb-2 font-medium">Result</th>
              <th className="pb-2 font-medium">Score</th>
              <th className="pb-2 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 font-mono">{r.suite}</td>
                <td className={`py-2 ${r.passed ? "text-approved" : "text-rejected"}`}>
                  {r.passed ? "passed" : "failed"}
                </td>
                <td className="py-2">{r.score === null ? "—" : r.score.toFixed(2)}</td>
                <td className="py-2 text-right text-muted">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
