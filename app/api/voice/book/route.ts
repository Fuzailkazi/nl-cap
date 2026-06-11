import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db";
import { generateBookingCode } from "@/lib/voice/scheduler";
import { notesDocAppend } from "@/lib/mcp/tools";

export const runtime = "nodejs";

/**
 * POST { slot } → create a booking with a KV-XNNN code, then enqueue a
 * notes_doc_append action (the booking code is visible in the Approval Centre).
 * Returns { code, slot, actionId }.
 */
export async function POST(req: Request) {
  let slot: unknown;
  try {
    ({ slot } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof slot !== "string" || !slot.trim()) {
    return NextResponse.json({ error: "slot is required" }, { status: 400 });
  }

  const db = serviceClient();
  try {
    // Insert the booking, retrying on the rare unique-code collision.
    let code = "";
    let inserted = false;
    for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
      code = generateBookingCode();
      const { error } = await db.from("bookings").insert({ code, slot });
      if (!error) {
        inserted = true;
      } else if (!error.message.toLowerCase().includes("duplicate") && error.code !== "23505") {
        throw new Error(error.message);
      }
    }
    if (!inserted) throw new Error("could not generate a unique booking code");

    // Append the code to the shared notes doc — through the approval gate.
    const { actionId } = await notesDocAppend(`Advisor call booked — code ${code}, slot: ${slot}.`);
    return NextResponse.json({ code, slot, actionId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
