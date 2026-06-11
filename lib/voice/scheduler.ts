import { detectPII, BOOKING_CODE_REGEX, PII_DEFLECTION } from "@/lib/contracts";

/**
 * Pillar 3 — Voice Scheduler pure logic (no browser, no DB) so it is unit/eval
 * testable. The greeting interpolates the current pulse top theme (flow B);
 * volunteered PII is deflected with the verbatim string and NEVER echoed/stored.
 */

/** Greeting template — MUST interpolate the current pulse top theme. */
export function buildGreeting(topTheme: string): string {
  const theme = topTheme.trim() || "investor support";
  return `Welcome to the HDFC Mutual Fund support line. This week our investors are most focused on ${theme}. I can help you book a call with an advisor — would you like to schedule one?`;
}

// Exclude easily-confused letters (I, O) but stay within [A-Z].
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Generate a booking code matching ^KV-[A-Z][0-9]{3}$ (e.g. KV-B391). */
export function generateBookingCode(): string {
  const letter = CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const code = `KV-${letter}${digits}`;
  // Defensive: the generator is constructed to satisfy the contract regex.
  if (!BOOKING_CODE_REGEX.test(code)) throw new Error(`generated invalid booking code: ${code}`);
  return code;
}

export type VoiceTurn =
  | { kind: "pii_deflected"; message: string }
  | { kind: "booking_intent"; message: string }
  | { kind: "prompt"; message: string };

const BOOKING_INTENT = /\b(book|schedule|appointment|advisor|call|meeting|slot)\b/i;

/**
 * Decide how to respond to a caller transcript. CRITICAL: if the transcript
 * contains PII, return the verbatim deflection and DO NOT include any part of
 * the transcript in the response (never echo/store volunteered PII).
 */
export function handleTranscript(transcript: string): VoiceTurn {
  if (detectPII(transcript)) {
    return { kind: "pii_deflected", message: PII_DEFLECTION };
  }
  if (BOOKING_INTENT.test(transcript)) {
    return { kind: "booking_intent", message: "Sure — I can book a call with an advisor. Which slot works for you?" };
  }
  return { kind: "prompt", message: "I can help you book a call with an advisor. Just say “book a call.”" };
}

/** Mock advisor slots (the contract allows mock calendar slots). */
export const MOCK_SLOTS = [
  "Tomorrow, 10:00 AM",
  "Tomorrow, 2:30 PM",
  "Thursday, 11:00 AM",
] as const;

/** Phrase a code for clear TTS readout, e.g. "K V - B 3 9 1". */
export function spellCodeForSpeech(code: string): string {
  return code.split("").join(" ").replace(/-/g, "dash");
}
