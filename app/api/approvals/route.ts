import { NextResponse } from "next/server";
import { listActions } from "@/lib/mcp/queue";
import { ApprovalStatus } from "@/lib/contracts";

export const runtime = "nodejs";

/** GET [?status=pending|approved|rejected] → { actions: ApprovalRow[] } */
export async function GET(req: Request) {
  const param = new URL(req.url).searchParams.get("status");
  const parsed = param ? ApprovalStatus.safeParse(param) : null;
  try {
    const actions = await listActions(parsed?.success ? parsed.data : undefined);
    return NextResponse.json({ actions });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
