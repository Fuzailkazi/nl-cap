import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db";
import { getReviewInputs } from "@/lib/reviews/ingest";
import { weeklyPulse } from "@/lib/llm/weeklyPulse";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST → regenerate the Weekly Pulse from the reviews table; write + return it. */
export async function POST() {
  try {
    const reviews = await getReviewInputs();
    if (reviews.length === 0) {
      return NextResponse.json({ error: "no reviews ingested — run `npm run reviews`" }, { status: 400 });
    }
    const { pulse, body, wordCount } = await weeklyPulse(reviews);
    const { data, error } = await serviceClient()
      .from("pulses")
      .insert({ top_theme: pulse.topTheme, body, word_count: wordCount })
      .select("id, top_theme, body, word_count, created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ pulse: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
