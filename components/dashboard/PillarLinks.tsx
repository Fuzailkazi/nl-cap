import Link from "next/link";
import { Card } from "@/components/ui";

const PILLARS = [
  { href: "/faq", label: "FAQ Bot", desc: "Factual answers, one citation, never advice." },
  { href: "/reviews", label: "Review Intelligence", desc: "Weekly Pulse + Fee Explainer → corpus." },
  { href: "/voice", label: "Voice Scheduler", desc: "Greeting from the pulse; booking codes." },
  { href: "/approvals", label: "Approval Centre", desc: "Human gate for every MCP action." },
];

export function PillarLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PILLARS.map((p) => (
        <Link key={p.href} href={p.href} className="no-underline">
          <Card className="transition-colors hover:border-brand">
            <div className="font-medium text-brand">{p.label} →</div>
            <div className="mt-1 text-sm text-muted">{p.desc}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
