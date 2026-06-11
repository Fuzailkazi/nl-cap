"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { handleTranscript, spellCodeForSpeech, MOCK_SLOTS } from "@/lib/voice/scheduler";
import { Card, Button, Input } from "@/components/ui";
import { BookingCodeBadge } from "@/components/voice/BookingCodeBadge";

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
    recog.onresult = (e) => processCallerInput(e.results[0]?.[0]?.transcript ?? "");
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
      setLog((l) => [...l, { who: "assistant", text: `Booked for ${slot}. Booking code: ${d.code}.` }]);
      speak(`Your call is booked for ${slot}. Your booking code is ${spellCodeForSpeech(d.code)}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="h2">Voice Scheduler</h1>
        <p className="text-sm text-muted">
          Browser voice (Web Speech) with a typed fallback. The greeting reflects this week&apos;s
          pulse theme; the booking code is read aloud and queued to the shared notes doc.
        </p>
      </div>

      {error && <div className="text-sm text-rejected">{error}</div>}

      <Card>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          Greeting {topTheme && `· top theme: ${topTheme}`}
        </div>
        <p className="mt-1 text-sm">{greeting || "Loading…"}</p>
        <Button variant="ghost" onClick={() => greeting && speak(greeting)} className="mt-2 text-xs">
          ▶ Replay greeting
        </Button>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={startListening}
          disabled={listening || !micSupported}
          variant={listening ? "danger" : "primary"}
          className="rounded-full px-5"
        >
          {listening ? "● Listening…" : micSupported ? "🎤 Speak" : "🎤 Mic unavailable"}
        </Button>
        <span className="text-xs text-muted">
          {micSupported ? 'Try: "I\'d like to book a call."' : "No speech recognition — use the box below."}
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
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Typed fallback — e.g. book a call" />
        <Button type="submit">Send</Button>
      </form>

      {showSlots && !booking && (
        <Card>
          <div className="mb-2 text-sm font-medium">Pick a slot</div>
          <div className="flex flex-wrap gap-2">
            {MOCK_SLOTS.map((s) => (
              <Button key={s} variant="secondary" size="sm" onClick={() => book(s)}>
                {s}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {booking && (
        <Card>
          <div className="text-sm">Booked for {booking.slot}:</div>
          <div className="mt-2">
            <BookingCodeBadge code={booking.code} />
          </div>
          <div className="mt-2 text-xs text-muted">
            Queued action #{booking.actionId} (notes_doc_append) —{" "}
            <Link href="/approvals" className="text-brand underline">
              see it in the Approval Centre
            </Link>
            .
          </div>
        </Card>
      )}

      {log.length > 0 && (
        <Card>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Transcript</div>
          <div className="space-y-1 text-sm">
            {log.map((e, i) => (
              <div key={i}>
                <span className="text-muted">{e.who === "caller" ? "Caller" : "Assistant"}: </span>
                {e.text}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
