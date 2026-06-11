import { Card } from "@/components/ui";

export function EnvHealth({ health }: { health: [string, boolean][] }) {
  return (
    <Card>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Environment health</div>
      <ul className="space-y-2 text-sm">
        {health.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-2">
            <span className={ok ? "text-approved" : "text-rejected"}>●</span>
            <span>{label}</span>
            <span className="ml-auto text-xs text-muted">{ok ? "ready" : "not set"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
