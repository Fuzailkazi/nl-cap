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

export interface PulseContract {
  max_words: number;
  required_sections: string[];
  min_quotes: number;
  action_ideas_count: number;
}

/** Validate an assembled Weekly Pulse body against the contract. */
export function checkWeeklyPulse(body: string, c: PulseContract): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const words = (body.trim().match(/\S+/g) ?? []).length;
  if (words > c.max_words) issues.push(`${words} words > ${c.max_words}`);

  for (const s of c.required_sections) {
    if (!body.includes(s)) issues.push(`missing section "${s}"`);
  }

  const section = (name: string, next?: string): string => {
    const start = body.indexOf(name);
    if (start < 0) return "";
    const from = start + name.length;
    const end = next ? body.indexOf(next, from) : body.length;
    return body.slice(from, end < 0 ? body.length : end);
  };

  const quotes = (section("User Quotes", "Key Observation").match(/^\s*-\s+/gm) ?? []).length;
  if (quotes < c.min_quotes) issues.push(`${quotes} quotes < ${c.min_quotes}`);

  const actions = (section("Action Ideas").match(/^\s*\d+\.\s/gm) ?? []).length;
  if (actions !== c.action_ideas_count) issues.push(`${actions} action ideas ≠ ${c.action_ideas_count}`);

  return { ok: issues.length === 0, issues };
}

export interface FeeContract {
  bullet_count: number;
  source_link_count: number;
  ends_with_regex: string;
}

/** Validate an assembled Fee Explainer content string against the contract. */
export function checkFeeExplainer(content: string, c: FeeContract): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const splitAt = content.indexOf("Sources:");
  const body = splitAt < 0 ? content : content.slice(0, splitAt);
  const sources = splitAt < 0 ? "" : content.slice(splitAt);

  const bullets = (body.match(/^\s*-\s+/gm) ?? []).length;
  if (bullets !== c.bullet_count) issues.push(`${bullets} bullets ≠ ${c.bullet_count}`);

  const links = (sources.match(/https?:\/\/\S+/g) ?? []).length;
  if (links !== c.source_link_count) issues.push(`${links} source links ≠ ${c.source_link_count}`);

  if (!new RegExp(c.ends_with_regex).test(content.trim())) {
    issues.push(`does not end with "Last checked: YYYY-MM-DD"`);
  }
  return { ok: issues.length === 0, issues };
}
