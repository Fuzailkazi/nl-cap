import { serviceClient } from "@/lib/db";
import { embedText } from "@/lib/rag/embed";
import type { RetrievalHit, RetrieveFn } from "@/lib/contracts";

/**
 * In-memory cosine retrieval over the corpus. The corpus is small (a few
 * dozen rows), so embedding the query then scoring every row in JS is simpler
 * and cheaper than an RPC, and avoids depending on a pgvector index/operator
 * being wired up. Returns the top-K hits sorted by similarity desc.
 */

interface CorpusRow {
  id: number;
  doc_type: string;
  scheme: string | null;
  title: string;
  url: string | null;
  content: string;
  embedding: string | number[];
}

function parseEmbedding(raw: string | number[]): number[] {
  if (Array.isArray(raw)) return raw;
  // pgvector returns the column as a text like "[0.1,0.2,...]".
  return JSON.parse(raw) as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export const retrieve: RetrieveFn = async (query, opts) => {
  const topK = opts?.topK ?? 5;
  const scheme = opts?.scheme ?? null;

  const queryVec = await embedText(query);

  const db = serviceClient();
  let q = db
    .from("corpus")
    .select("id, doc_type, scheme, title, url, content, embedding");

  if (scheme) {
    // Rows for this scheme OR scheme-agnostic (null) rows.
    q = q.or(`scheme.eq.${scheme},scheme.is.null`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`Corpus retrieval failed: ${error.message}`);

  const rows = (data ?? []) as CorpusRow[];

  const scored: RetrievalHit[] = rows.map((row) => ({
    id: row.id,
    docType: row.doc_type,
    scheme: row.scheme,
    title: row.title,
    url: row.url,
    content: row.content,
    similarity: cosineSimilarity(queryVec, parseEmbedding(row.embedding)),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
};
