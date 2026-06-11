"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { handleTranscript, spellCodeForSpeech, MOCK_SLOTS } from "@/lib/voice/scheduler";
import { BookingCodeBadge, cardClass, cardStyle } from "@/app/components/ui";

// Minimal Web Speech typings (not in lib.dom for all targets).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SRConstructor = new () => SpeechRecognitionLike;

type LogEntry = { who: "caller" | "assistant"; text: string };

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function VoicePage() {
  const [greeting, setGreeting] = useState("");
  const [topTheme, setTopTheme] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [typed, setTyped] = useState("");
  const [showSlots, setShowSlots] = useState(false);
  const [booking, setBooking] = useState<{ code: string; slot: string; actionId: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    fetch("/api/voice/greeting")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setGreeting(d.greeting);
        setTopTheme(d.topTheme);
        speak(d.greeting);
      })
      .catch((e) => setError(String(e)));

    const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function processCallerInput(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const turn = handleTranscript(text);

    // Never echo/store volunteered PII: redact the caller line on the screen.
    setLog((l) => [
      ...l,
      { who: "caller", text: turn.kind === "pii_deflected" ? "[personal details — not stored]" : text },
      { who: "assistant", text: turn.message },
    ]);
    speak(turn.message);
    if (turn.kind === "booking_intent") setShowSlots(true);
  }

  function startListening() {
    setError(null);
    const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setMicSupported(false);
      return;
    }
    const recog = new Ctor();
    recog.lang = "en-IN";
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      processCallerInput(transcript);
    };
    recog.onerror = (e) => {
      setError(`Mic error: ${e.error}. Use the typed fallback below.`);
      setListening(false);
    };
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    setListening(true);
    recog.start();
  }

  async function book(slot: string) {
    setError(null);
    try {
      const res = await fetch("/api/voice/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setBooking(d);
      setShowSlots(false);
      const line = `Your call is booked for ${slot}. Your booking code is ${spellCodeForSpeech(d.code)}.`;
      setLog((l) => [...l, { who: "assistant", text: `Booked for ${slot}. Booking code: ${d.code}.` }]);
      speak(line);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Voice Scheduler</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Browser voice (Web Speech) with a typed fallback. The greeting reflects this week&apos;s
          pulse theme; the booking code is read aloud and queued to the shared notes doc.
        </p>
      </div>

      {error && (
        <div className="text-sm" style={{ color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      <div className={cardClass} style={cardStyle}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Greeting {topTheme && `· top theme: ${topTheme}`}
        </div>
        <p className="mt-1 text-sm">{greeting || "Loading…"}</p>
        <button onClick={() => greeting && speak(greeting)} className="mt-2 text-xs underline" style={{ color: "var(--color-brand)" }}>
          ▶ Replay greeting
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={startListening}
          disabled={listening || !micSupported}
          className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: listening ? "var(--color-rejected)" : "var(--color-brand)" }}
        >
          {listening ? "● Listening…" : micSupported ? "🎤 Speak" : "🎤 Mic unavailable"}
        </button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {micSupported ? 'Try: "I\'d like to book a call."' : "Your browser has no speech recognition — use the box below."}
        </span>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          processCallerInput(typed);
          setTyped("");
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Typed fallback — e.g. book a call"
          className="flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />
        <button type="submit" className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium" style={{ background: "var(--color-brand)", color: "var(--color-brand-fg)" }}>
          Send
        </button>
      </form>

      {showSlots && !booking && (
        <div className={cardClass} style={cardStyle}>
          <div className="mb-2 text-sm font-medium">Pick a slot</div>
          <div className="flex flex-wrap gap-2">
            {MOCK_SLOTS.map((s) => (
              <button key={s} onClick={() => book(s)} className="rounded-md border px-3 py-1 text-sm" style={{ borderColor: "var(--border)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {booking && (
        <div className={cardClass} style={cardStyle}>
          <div className="text-sm">Booked for {booking.slot}:</div>
          <div className="mt-2">
            <BookingCodeBadge code={booking.code} />
          </div>
          <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            Queued action #{booking.actionId} (notes_doc_append) —{" "}
            <Link href="/approvals" className="underline">see it in the Approval Centre</Link>.
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className={cardClass} style={cardStyle}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Transcript
          </div>
          <div className="space-y-1 text-sm">
            {log.map((e, i) => (
              <div key={i}>
                <span style={{ color: "var(--muted)" }}>{e.who === "caller" ? "Caller" : "Assistant"}: </span>
                {e.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
