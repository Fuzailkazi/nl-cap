import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db";

export const runtime = "nodejs";

/** GET → { pulse: latest pulses row | null } */
export async function GET() {
  try {
    const { data, error } = await serviceClient()
      .from("pulses")
      .select("id, top_theme, body, word_count, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ pulse: data?.[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
