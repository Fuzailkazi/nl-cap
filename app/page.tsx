import { envStatus } from "@/lib/config/env";
import { serviceClient } from "@/lib/db";
import { Card, Section } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { PillarLinks } from "@/components/dashboard/PillarLinks";
import { EnvHealth } from "@/components/dashboard/EnvHealth";
import { EvalRunsTable, type EvalRun } from "@/components/dashboard/EvalRunsTable";

export const dynamic = "force-dynamic";

interface DashboardData {
  corpusDocs: number | null;
  pendingApprovals: number | null;
  bookings: number | null;
  topTheme: string | null;
  evalRuns: EvalRun[];
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
      evalRuns: (evalRes.data as EvalRun[]) ?? [],
      dbError: null,
    };
  } catch (e) {
    return { corpusDocs: null, pendingApprovals: null, bookings: null, topTheme: null, evalRuns: [], dbError: (e as Error).message };
  }
}

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
        <Card className="border-rejected">
          <span className="text-sm text-rejected">Couldn’t load live data: {d.dbError}</span>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Corpus documents" value={fmt(d.corpusDocs)} hint="pgvector chunks + explainers" />
        <StatCard label="Pending approvals" value={fmt(d.pendingApprovals)} accent hint="awaiting human review" />
        <StatCard label="Bookings" value={fmt(d.bookings)} hint="advisor calls scheduled" />
        <StatCard label="This week’s theme" value={d.topTheme ?? "—"} hint="drives the voice greeting" />
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <PillarLinks />
        <EnvHealth health={health} />
      </section>

      <Section title="Recent eval runs">
        <EvalRunsTable runs={d.evalRuns} />
      </Section>
    </div>
  );
}
