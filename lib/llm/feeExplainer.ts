import { z } from "zod";
import { type FeeExplainer, feeExplainerSchema } from "@/lib/contracts";
import { generationClient } from "@/lib/llm/client";

/**
 * Pillar 2 — Fee Explainer. Inserted into the corpus as doc_type='fee_explainer'
 * (the flow-A refresh). Contract: exactly 6 bullets, neutral tone, exactly 2
 * official source links, ends with "Last checked: YYYY-MM-DD".
 *
 * The model only writes the title + 6 bullets. The two OFFICIAL sources and the
 * date stamp are injected server-side, so the "exactly 2 official links + Last
 * checked" parts of the contract hold regardless of model behaviour.
 */
export const FEE_EXPLAINER_SYSTEM_PROMPT = `You write a neutral, factual explainer about the FEES and costs of investing in mutual funds (expense ratio / TER, exit load, direct vs regular plans, how recurring costs affect long-term returns, where investors can find a scheme's current TER, and any applicable taxes/GST on charges).

Produce JSON with:
- title: a short factual title (e.g. "Understanding Mutual Fund Fees").
- bullets: EXACTLY 6 bullet strings. Neutral and educational. Each one short (one sentence). No investment advice, no recommendations, no performance claims, no scheme cherry-picking. Do NOT include URLs in the bullets (sources are added separately).

Respond ONLY with the JSON object.`;

const RESPONSE_JSON_SCHEMA = {
  name: "fee_explainer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      bullets: { type: "array", items: { type: "string" } },
    },
    required: ["title", "bullets"],
  },
} as const;

/** The two official, verified-200 sources cited by every fee explainer. */
export const OFFICIAL_FEE_SOURCES = [
  { title: "AMFI — Association of Mutual Funds in India", url: "https://www.amfiindia.com/" },
  { title: "SEBI Investor Education", url: "https://investor.sebi.gov.in/" },
] as const;

const draftSchema = z.object({ title: z.string().min(1), bullets: z.array(z.string().min(1)).length(6) });

async function callOnce(): Promise<z.infer<typeof draftSchema> | null> {
  const { client, model } = generationClient();
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: FEE_EXPLAINER_SYSTEM_PROMPT },
      { role: "user", content: "Write the fee explainer." },
    ],
    response_format: { type: "json_schema", json_schema: RESPONSE_JSON_SCHEMA },
  });
  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/** Generate a compliant Fee Explainer. Zod-validate → retry once → inject sources + stamp. */
export async function feeExplainer(
  opts: { scheme?: string | null; lastChecked?: string } = {},
): Promise<FeeExplainer> {
  let draft = await callOnce();
  if (!draft) draft = await callOnce();
  if (!draft) throw new Error("feeExplainer: model returned invalid output twice");

  const explainer: FeeExplainer = {
    scheme: opts.scheme ?? null,
    title: draft.title,
    bullets: draft.bullets,
    sources: OFFICIAL_FEE_SOURCES.map((s) => ({ ...s })),
    lastChecked: opts.lastChecked ?? today(),
  };
  // Final guarantee: the full contract holds (6 bullets, 2 official links, stamp).
  return feeExplainerSchema.parse(explainer);
}
