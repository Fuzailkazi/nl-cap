import { NextResponse } from "next/server";
import { retrieve } from "@/lib/rag/retrieve";
import { faqAnswer } from "@/lib/llm/faqAnswer";

export const runtime = "nodejs";

/** POST { question } → { answer: FaqAnswer, hitCount } */
export async function POST(req: Request) {
  let question: unknown;
  try {
    ({ question } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  try {
    const hits = await retrieve(question, { topK: 6 });
    const answer = await faqAnswer(question, hits);
    return NextResponse.json({ answer, hitCount: hits.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
