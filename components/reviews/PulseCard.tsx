import { Card } from "@/components/ui";

export function PulseCard({
  pulse,
}: {
  pulse: { top_theme: string; body: string; word_count: number | null };
}) {
  const over = (pulse.word_count ?? 0) > 250;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Weekly Pulse</div>
        <span className={`text-xs ${over ? "text-rejected" : "text-muted"}`}>
          {pulse.word_count ?? "—"} words
        </span>
      </div>
      <div className="mt-1 text-sm">
        Top theme: <span className="font-medium text-brand">{pulse.top_theme}</span>
      </div>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{pulse.body}</pre>
    </Card>
  );
}
