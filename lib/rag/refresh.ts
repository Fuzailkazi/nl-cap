import { serviceClient } from "@/lib/db";
import { embedText } from "@/lib/rag/embed";
import { assembleFeeExplainerContent, type FeeExplainer } from "@/lib/contracts";

/**
 * Flow (A): the corpus "refresh" mechanism. A generated Fee Explainer is
 * inserted into the SINGLE corpus table as a row with doc_type='fee_explainer'.
 * The FAQ bot then retrieves it on the next query with zero code change.
 *
 * This is the ONLY way fee_explainer rows enter the corpus. It is idempotent:
 * an explainer with the same (title, scheme) replaces the previous one.
 */
export async function refreshCorpus(
  explainer: FeeExplainer,
): Promise<{ corpusId: number; citationUrl: string }> {
  const db = serviceClient();
  const content = assembleFeeExplainerContent(explainer);
  const citationUrl = explainer.sources[0].url;

  // Idempotent: drop any prior fee_explainer with the same title + scheme.
  let del = db.from("corpus").delete().eq("doc_type", "fee_explainer").eq("title", explainer.title);
  del = explainer.scheme === null ? del.is("scheme", null) : del.eq("scheme", explainer.scheme);
  const { error: delErr } = await del;
  if (delErr) throw new Error(`refreshCorpus delete failed: ${delErr.message}`);

  const embedding = await embedText(content);
  const { data, error } = await db
    .from("corpus")
    .insert({
      doc_type: "fee_explainer",
      scheme: explainer.scheme,
      title: explainer.title,
      url: citationUrl,
      content,
      embedding: `[${embedding.join(",")}]`,
      last_checked: explainer.lastChecked,
    })
    .select("id")
    .single();
  if (error) throw new Error(`refreshCorpus insert failed: ${error.message}`);
  return { corpusId: data.id as number, citationUrl };
}
