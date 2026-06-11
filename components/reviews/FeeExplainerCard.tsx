import { Card } from "@/components/ui";
import type { FeeExplainer } from "@/lib/contracts";

export function FeeExplainerCard({ explainer }: { explainer: FeeExplainer }) {
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        Fee Explainer · doc_type=fee_explainer
      </div>
      <div className="mt-1 font-medium">{explainer.title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {explainer.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div className="mt-3 text-xs text-muted">
        Sources:
        <ul className="list-disc pl-5">
          {explainer.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-1">Last checked: {explainer.lastChecked}</div>
      </div>
    </Card>
  );
}
