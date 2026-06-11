import { NextResponse } from "next/server";
import { feeExplainer } from "@/lib/llm/feeExplainer";
import { refreshCorpus } from "@/lib/rag/refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST → generate a Fee Explainer and insert it into the corpus as
 * doc_type='fee_explainer' (flow-A refresh). Returns the explainer + corpus id.
 */
export async function POST() {
  try {
    const explainer = await feeExplainer();
    const { corpusId, citationUrl } = await refreshCorpus(explainer);
    return NextResponse.json({ explainer, corpusId, citationUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
