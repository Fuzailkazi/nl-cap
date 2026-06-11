/**
 * Pure, rule-based structure checkers. No LLM, no I/O — so they can be
 * exercised against fixtures at M0 and reused against real generated output in
 * M2/M3. (Pulse + fee-explainer checkers are added in M2 alongside their
 * generators; only the rules with M0 fixtures live here for now.)
 */

/** Booking code must match the canonical contract regex, e.g. KV-B391. */
export function checkBookingCode(code: string, regex: string): boolean {
  return new RegExp(regex).test(code);
}

/** Voice greeting must interpolate the current pulse top theme verbatim. */
export function greetingInterpolatesTopTheme(greeting: string, topTheme: string): boolean {
  return topTheme.trim().length > 0 && greeting.includes(topTheme);
}
