import {
  type ReviewInput,
  type WeeklyPulse,
  weeklyPulseSchema,
  assembleWeeklyPulseBody,
} from "@/lib/contracts";
import { generationClient } from "@/lib/llm/client";

/**
 * Pillar 2 — Weekly Pulse over customer reviews.
 * Contract: ≤250 words; sections Top Themes / User Quotes (≥1) / Key
 * Observation / Action Ideas (exactly 3). NO PII in any quote or theme.
 * Prompt is a NAMED export so evals import the exact production prompt.
 */
export const WEEKLY_PULSE_SYSTEM_PROMPT = `You analyse a week of customer reviews for HDFC Mutual Fund support and produce a concise internal "Weekly Pulse".

Produce JSON with:
- topTheme: the single most prominent theme as a short phrase (3-6 words) — this is read aloud later, so keep it natural.
- topThemes: 2-4 short theme phrases (most discussed issues/sentiments).
- quotes: 1-3 SHORT representative quotes drawn from the reviews. Quote real review wording. NEVER include any personal data (names, emails, phone/folio/PAN numbers) — if a quote would contain any, paraphrase to remove it.
- keyObservation: one or two sentences of insight.
- actionIdeas: EXACTLY 3 concrete, neutral action ideas for the support/product team.

Hard rules:
- The WHOLE pulse, once assembled, must be UNDER 250 words. Be terse.
- Neutral, factual, internal tone. No investment advice, no performance claims.
- No PII anywhere.
Respond ONLY with the JSON object.`;

const RESPONSE_JSON_SCHEMA = {
  name: "weekly_pulse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      topTheme: { type: "string" },
      topThemes: { type: "array", items: { type: "string" } },
      quotes: { type: "array", items: { type: "string" } },
      keyObservation: { type: "string" },
      actionIdeas: { type: "array", items: { type: "string" } },
    },
    required: ["topTheme", "topThemes", "quotes", "keyObservation", "actionIdeas"],
  },
} as const;

function reviewsBlock(reviews: ReviewInput[]): string {
  return reviews
    .map((r) => `(${r.scheme}, ${r.channel}, ${r.rating}★) ${r.title ? r.title + " — " : ""}${r.text}`)
    .join("\n");
}

async function callOnce(reviews: ReviewInput[], extra: string): Promise<WeeklyPulse | null> {
  const { client, model } = generationClient();
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: WEEKLY_PULSE_SYSTEM_PROMPT + extra },
      { role: "user", content: `Reviews this week:\n${reviewsBlock(reviews)}` },
    ],
    response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
  });
  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = weeklyPulseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const wordCount = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

/** Generate a compliant Weekly Pulse. Zod-validate → retry once → enforce ≤250 words. */
export async function weeklyPulse(
  reviews: ReviewInput[],
): Promise<{ pulse: WeeklyPulse; body: string; wordCount: number }> {
  let pulse = await callOnce(reviews, "");
  if (!pulse) pulse = await callOnce(reviews, "");
  if (!pulse) throw new Error("weeklyPulse: model returned invalid output twice");

  let body = assembleWeeklyPulseBody(pulse);
  if (wordCount(body) > 250) {
    // One stricter retry to fit the 250-word contract.
    const tighter = await callOnce(reviews, "\nThe previous attempt was too long. Be MUCH terser — well under 250 words total.");
    if (tighter) {
      const tbody = assembleWeeklyPulseBody(tighter);
      if (wordCount(tbody) <= 250) {
        pulse = tighter;
        body = tbody;
      }
    }
  }
  return { pulse, body, wordCount: wordCount(body) };
}
