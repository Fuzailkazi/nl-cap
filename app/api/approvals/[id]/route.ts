import { NextResponse } from "next/server";
import { approveAction, rejectAction } from "@/lib/mcp/execute";

export const runtime = "nodejs";

/** POST { decision: "approve" | "reject" } → { row: ApprovalRow } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const actionId = Number(id);
  if (!Number.isInteger(actionId)) {
    return NextResponse.json({ error: "invalid action id" }, { status: 400 });
  }
  let decision: unknown;
  try {
    ({ decision } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }
  try {
    const row = decision === "approve" ? await approveAction(actionId) : await rejectAction(actionId);
    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
