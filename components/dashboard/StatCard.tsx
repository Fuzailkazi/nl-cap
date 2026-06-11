import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  accent,
  compact,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <Card>
      <div className="label">{label}</div>
      <div
        className={cn(
          "mt-2 truncate font-semibold tracking-tight",
          compact ? "text-lg" : "text-4xl",
          accent ? "text-brand" : "text-fg",
        )}
        title={String(value)}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
