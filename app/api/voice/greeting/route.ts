import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db";
import { buildGreeting } from "@/lib/voice/scheduler";

export const runtime = "nodejs";

/** GET → { topTheme, greeting }. Reads the LATEST pulse (flow B). Read-only. */
export async function GET() {
  try {
    const { data, error } = await serviceClient()
      .from("pulses")
      .select("top_theme")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const topTheme = (data?.[0]?.top_theme as string | undefined) ?? "";
    return NextResponse.json({ topTheme, greeting: buildGreeting(topTheme) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
