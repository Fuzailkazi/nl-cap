"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FaqAnswer } from "@/lib/contracts";
import { Card, Button, Input, Skeleton } from "@/components/ui";
import { CitationCard, RefusalNotice } from "@/components/shared";
import { ChatBubble } from "@/components/faq/ChatBubble";

type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; answer: FaqAnswer; question: string };

const SUGGESTED = [
  "What benchmark does the HDFC Flexi Cap Fund use?",
  "Is the HDFC Balanced Advantage Fund equity, debt, or hybrid?",
  "Which HDFC fund should I buy for the best returns?",
];

export default function FaqPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setDraftNote(null);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      setMessages((m) => [...m, { role: "assistant", answer: data.answer as FaqAnswer, question }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          question,
          answer: { kind: "corpus_miss", text: `Error: ${(e as Error).message}`, citationUrl: null, citationTitle: null },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function draftEmail(question: string, answer: FaqAnswer) {
    setDraftNote("Drafting…");
    try {
      const res = await fetch("/api/faq/draft-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: `Follow-up: ${question}`,
          body: `You asked: ${question}\n\nOur answer: ${answer.text}\n\n${answer.citationUrl ? `Source: ${answer.citationUrl}` : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setDraftNote(`Queued action #${data.actionId} — review it in the Approval Centre.`);
    } catch (e) {
      setDraftNote(`Could not draft: ${(e as Error).message}`);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-2xl flex-col">
      <h1 className="h2">FAQ Bot</h1>
      <p className="text-sm text-muted">
        Factual answers about HDFC schemes — ≤3 sentences, one citation, never advice.
      </p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted">Try:</div>
            {SUGGESTED.map((s) => (
              <Card key={s} interactive onClick={() => ask(s)} className="text-sm">
                {s}
              </Card>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <ChatBubble key={i} role="user">
              {m.text}
            </ChatBubble>
          ) : (
            <div key={i} className="space-y-1">
              {m.answer.kind === "answer" ? (
                <>
                  <ChatBubble role="assistant">{m.answer.text}</ChatBubble>
                  {m.answer.citationUrl && (
                    <CitationCard url={m.answer.citationUrl} title={m.answer.citationTitle} />
                  )}
                  <Button variant="ghost" onClick={() => draftEmail(m.question, m.answer)} className="text-xs">
                    Draft follow-up email →
                  </Button>
                </>
              ) : (
                <RefusalNotice answer={m.answer} />
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
              A
            </span>
            <Skeleton className="h-10 w-44 rounded-2xl" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {draftNote && (
        <div className="mt-2 text-xs text-muted">
          {draftNote}{" "}
          <Link href="/approvals" className="text-brand underline">
            Open Approval Centre
          </Link>
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about an HDFC scheme…" />
        <Button type="submit" disabled={busy}>
          Send
        </Button>
      </form>
    </div>
  );
}
