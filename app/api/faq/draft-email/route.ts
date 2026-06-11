import { NextResponse } from "next/server";
import { emailDraftGenerate } from "@/lib/mcp/tools";

export const runtime = "nodejs";

/**
 * POST { subject, body } → { actionId }. Enqueue-only: this drafts a follow-up
 * email through the MCP gate. It is NOT sent — it lands in the Approval Centre.
 */
export async function POST(req: Request) {
  let subject: unknown, body: unknown;
  try {
    ({ subject, body } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }
  try {
    const { actionId } = await emailDraftGenerate(subject, body);
    return NextResponse.json({ actionId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
