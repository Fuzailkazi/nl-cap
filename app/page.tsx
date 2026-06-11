import Link from "next/link";
import { envStatus } from "@/lib/config/env";
import { serviceClient } from "@/lib/db";
import { StatCard, cardClass, cardStyle } from "@/app/components/ui";

export const dynamic = "force-dynamic";

interface DashboardData {
  corpusDocs: number | null;
  pendingApprovals: number | null;
  bookings: number | null;
  topTheme: string | null;
  evalRuns: { suite: string; passed: boolean; score: number | null; created_at: string }[];
  dbError: string | null;
}

async function loadDashboard(): Promise<DashboardData> {
  try {
    const db = serviceClient();
    const head = { count: "exact" as const, head: true };
    const [corpusRes, pendingRes, bookingsRes, pulseRes, evalRes] = await Promise.all([
      db.from("corpus").select("*", head),
      db.from("approval_queue").select("*", head).eq("status", "pending"),
      db.from("bookings").select("*", head),
      db.from("pulses").select("top_theme").order("created_at", { ascending: false }).limit(1),
      db
        .from("eval_runs")
        .select("suite, passed, score, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    const err =
      corpusRes.error || pendingRes.error || bookingsRes.error || pulseRes.error || evalRes.error;
    if (err) throw new Error(err.message);
    return {
      corpusDocs: corpusRes.count ?? 0,
      pendingApprovals: pendingRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
      topTheme: (pulseRes.data?.[0]?.top_theme as string | undefined) ?? null,
      evalRuns: (evalRes.data as DashboardData["evalRuns"]) ?? [],
      dbError: null,
    };
  } catch (e) {
    return {
      corpusDocs: null,
      pendingApprovals: null,
      bookings: null,
      topTheme: null,
      evalRuns: [],
      dbError: (e as Error).message,
    };
  }
}

const PILLARS = [
  { href: "/faq", label: "FAQ Bot", desc: "Factual answers, one citation, never advice." },
  { href: "/reviews", label: "Review Intelligence", desc: "Weekly Pulse + Fee Explainer → corpus." },
  { href: "/voice", label: "Voice Scheduler", desc: "Greeting from the pulse; booking codes." },
  { href: "/approvals", label: "Approval Centre", desc: "Human gate for every MCP action." },
];

export default async function Dashboard() {
  const d = await loadDashboard();
  const env = envStatus();
  const health: [string, boolean][] = [
    ["Supabase", env.supabaseService],
    ["OpenAI generation", env.generation],
    ["OpenAI embeddings", env.embeddings],
  ];
  const fmt = (n: number | null) => (n === null ? "—" : String(n));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="h1 text-balance">Advisor Intelligence Suite</h1>
        <p className="lead mt-2 max-w-2xl">
          Voice-first, facts-only support for HDFC Mutual Fund. Three pillars over one RAG corpus and
          one human-approval gate.
        </p>
      </header>

      {d.dbError && (
        <div className={cardClass} style={{ ...cardStyle, borderColor: "var(--color-rejected)" }}>
          <span className="text-sm" style={{ color: "var(--color-rejected)" }}>
            Couldn’t load live data: {d.dbError}
          </span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Corpus documents" value={fmt(d.corpusDocs)} hint="pgvector chunks + explainers" />
        <StatCard label="Pending approvals" value={fmt(d.pendingApprovals)} accent hint="awaiting human review" />
        <StatCard label="Bookings" value={fmt(d.bookings)} hint="advisor calls scheduled" />
        <StatCard label="This week’s theme" value={d.topTheme ?? "—"} hint="drives the voice greeting" />
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <Link key={p.href} href={p.href} className={`${cardClass} no-underline transition-colors hover:border-[var(--color-brand)]`} style={cardStyle}>
              <div className="font-medium" style={{ color: "var(--color-brand)" }}>
                {p.label} →
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {p.desc}
              </div>
            </Link>
          ))}
        </div>

        <div className={cardClass} style={cardStyle}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Environment health
          </div>
          <ul className="space-y-2 text-sm">
            {health.map(([label, ok]) => (
              <li key={label} className="flex items-center gap-2">
                <span style={{ color: ok ? "var(--color-approved)" : "var(--color-rejected)" }}>●</span>
                <span>{label}</span>
                <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
                  {ok ? "ready" : "not set"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Recent eval runs
        </h2>
        <div className={cardClass} style={cardStyle}>
          {d.evalRuns.length === 0 ? (
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              No eval runs recorded yet — run <code>npm run eval:all</code>.
            </span>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--muted)" }} className="text-left text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Suite</th>
                  <th className="pb-2 font-medium">Result</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {d.evalRuns.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 font-mono">{r.suite}</td>
                    <td className="py-2">
                      <span style={{ color: r.passed ? "var(--color-approved)" : "var(--color-rejected)" }}>
                        {r.passed ? "passed" : "failed"}
                      </span>
                    </td>
                    <td className="py-2">{r.score === null ? "—" : r.score.toFixed(2)}</td>
                    <td className="py-2 text-right" style={{ color: "var(--muted)" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
