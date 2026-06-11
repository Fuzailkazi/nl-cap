"use client";

import { useEffect, useState } from "react";
import type { FaqAnswer, FeeExplainer } from "@/lib/contracts";
import {
  PulseCard,
  FeeExplainerCard,
  CitationCard,
  RefusalNotice,
  cardClass,
  cardStyle,
} from "@/app/components/ui";

type Pulse = { top_theme: string; body: string; word_count: number | null };

export default function ReviewsPage() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [explainer, setExplainer] = useState<FeeExplainer | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("What is an expense ratio and how do mutual fund fees work?");
  const [answer, setAnswer] = useState<FaqAnswer | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setPulse(d.pulse))
      .catch((e) => setError(String(e)));
  }, []);

  async function regenPulse() {
    setBusy("pulse");
    setError(null);
    try {
      const res = await fetch("/api/reviews/pulse", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPulse(d.pulse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function refreshCorpus() {
    setBusy("fee");
    setError(null);
    setRefreshNote(null);
    try {
      const res = await fetch("/api/reviews/fee-explainer", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setExplainer(d.explainer as FeeExplainer);
      setRefreshNote(`Inserted into corpus as doc_type='fee_explainer' (row #${d.corpusId}). It is now a citable FAQ source.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function requery() {
    setBusy("requery");
    setAnswer(null);
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAnswer(d.answer as FaqAnswer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Review Intelligence</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Weekly Pulse over customer reviews, and a Fee Explainer that refreshes the FAQ corpus.
        </p>
      </div>

      {error && (
        <div className="text-sm" style={{ color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Weekly Pulse</h2>
          <button onClick={regenPulse} disabled={busy === "pulse"} className="text-xs underline" style={{ color: "var(--color-brand)" }}>
            {busy === "pulse" ? "Generating…" : "Regenerate"}
          </button>
        </div>
        {pulse ? (
          <PulseCard pulse={pulse} />
        ) : (
          <div className={cardClass} style={cardStyle}>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              No pulse yet. Run <code>npm run reviews</code> or click Regenerate.
            </span>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Fee Explainer → corpus refresh (flow A)</h2>
          <button
            onClick={refreshCorpus}
            disabled={busy === "fee"}
            className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-brand)" }}
          >
            {busy === "fee" ? "Refreshing…" : "Generate & refresh corpus"}
          </button>
        </div>
        {refreshNote && (
          <div className="text-xs" style={{ color: "var(--color-approved)" }}>
            {refreshNote}
          </div>
        )}
        {explainer && <FeeExplainerCard explainer={explainer} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Re-query demo — proves the explainer is now retrievable</h2>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <button
            onClick={requery}
            disabled={busy === "requery"}
            className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--color-brand)", color: "var(--color-brand-fg)" }}
          >
            Ask FAQ
          </button>
        </div>
        {answer &&
          (answer.kind === "answer" ? (
            <div>
              <div className={cardClass} style={cardStyle}>
                <p className="text-sm">{answer.text}</p>
              </div>
              {answer.citationUrl && <CitationCard url={answer.citationUrl} title={answer.citationTitle} />}
            </div>
          ) : (
            <RefusalNotice answer={answer} />
          ))}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Tip: before refreshing, a fee question returns &quot;no verified source&quot;. After refreshing, the
          same question is answered and cites the fee explainer&apos;s source.
        </p>
      </section>
    </div>
  );
}
