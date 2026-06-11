import Link from "next/link";
import { envStatus } from "@/lib/config/env";
import { cardClass, cardStyle } from "@/app/components/ui";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const env = envStatus();
  const checks: [string, boolean][] = [
    ["Supabase (server)", env.supabaseService],
    ["OpenAI generation", env.generation],
    ["OpenAI embeddings", env.embeddings],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Mutual Fund Advisor Intelligence Suite</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Voice-first, facts-only support for HDFC Mutual Fund. Every outbound action passes a human
        approval gate.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/faq" className={`${cardClass} no-underline`} style={cardStyle}>
          <div className="font-medium">FAQ Bot →</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            Ask factual questions about the 4 schemes. One citation, never advice.
          </div>
        </Link>
        <Link href="/approvals" className={`${cardClass} no-underline`} style={cardStyle}>
          <div className="font-medium">Approval Centre →</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            Review and approve queued MCP actions. Nothing auto-sends.
          </div>
        </Link>
      </div>

      <div className={`${cardClass} mt-3`} style={cardStyle}>
        <div className="mb-2 text-sm font-medium">Environment health</div>
        <ul className="space-y-1 text-sm">
          {checks.map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2">
              <span style={{ color: ok ? "var(--color-approved)" : "var(--color-rejected)" }}>
                {ok ? "●" : "○"}
              </span>
              <span>{label}</span>
              <span style={{ color: "var(--muted)" }}>{ok ? "configured" : "not configured"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
