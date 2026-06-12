"use client";

import { useEffect, useState } from "react";
import type { FaqAnswer, FeeExplainer } from "@/lib/contracts";
import { Card, Button, Input } from "@/components/ui";
import { CitationCard, RefusalNotice } from "@/components/shared";
import { PulseCard } from "@/components/reviews/PulseCard";
import { FeeExplainerCard } from "@/components/reviews/FeeExplainerCard";
import { PulseHistory, type PulseItem } from "@/components/reviews/PulseHistory";

export default function ReviewsPage() {
  const [pulse, setPulse] = useState<PulseItem | null>(null);
  const [history, setHistory] = useState<PulseItem[]>([]);
  const [explainer, setExplainer] = useState<FeeExplainer | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("What is an expense ratio and how do mutual fund fees work?");
  const [answer, setAnswer] = useState<FaqAnswer | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => {
        setPulse(d.pulse);
        setHistory(d.history ?? []);
      })
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
      setHistory((h) => [d.pulse, ...h]);
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
        <h1 className="h2">Review Intelligence</h1>
        <p className="text-sm text-muted">
          Weekly Pulse over customer reviews, and a Fee Explainer that refreshes the FAQ corpus.
        </p>
      </div>

      {error && <div className="text-sm text-rejected">{error}</div>}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Weekly Pulse</h2>
          <Button variant="ghost" onClick={regenPulse} disabled={busy === "pulse"} className="text-xs">
            {busy === "pulse" ? "Generating…" : "Regenerate"}
          </Button>
        </div>
        {pulse ? (
          <PulseCard pulse={pulse} />
        ) : (
          <Card>
            <span className="text-sm text-muted">
              No pulse yet. Run <code>npm run reviews</code> or click Regenerate.
            </span>
          </Card>
        )}
        {history.length > 0 && (
          <div className="space-y-1">
            <div className="label">History (click to view)</div>
            <PulseHistory
              items={history}
              selectedId={pulse?.id ?? null}
              onSelect={(id) => {
                const it = history.find((h) => h.id === id);
                if (it) setPulse(it);
              }}
            />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Fee Explainer → corpus refresh (flow A)</h2>
          <Button size="sm" onClick={refreshCorpus} disabled={busy === "fee"}>
            {busy === "fee" ? "Refreshing…" : "Generate & refresh corpus"}
          </Button>
        </div>
        {refreshNote && <div className="text-xs text-approved">{refreshNote}</div>}
        {explainer && <FeeExplainerCard explainer={explainer} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Re-query demo — proves the explainer is now retrievable</h2>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={requery} disabled={busy === "requery"}>
            Ask FAQ
          </Button>
        </div>
        {answer &&
          (answer.kind === "answer" ? (
            <div>
              <Card>
                <p className="text-sm">{answer.text}</p>
              </Card>
              {answer.citationUrl && <CitationCard url={answer.citationUrl} title={answer.citationTitle} />}
            </div>
          ) : (
            <RefusalNotice answer={answer} />
          ))}
        <p className="text-xs text-muted">
          Tip: before refreshing, a fee question returns &quot;no verified source&quot;. After refreshing, the
          same question is answered and cites the fee explainer&apos;s source.
        </p>
      </section>
    </div>
  );
}
