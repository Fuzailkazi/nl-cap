import OpenAI from "openai";
import { requireEmbeddings } from "@/lib/config/env";
import { withRateLimitRetry } from "@/lib/rateLimit";

/**
 * Embedding helpers for the RAG layer. One OpenAI client is lazily constructed
 * the first time an embedding is requested (so importing this module never
 * touches env / network — consistent with the keys-later build).
 */

let _client: OpenAI | null = null;
let _model = "";
let _dim = 0;

function client(): { openai: OpenAI; model: string; dim: number } {
  if (!_client) {
    const { apiKey, embeddingModel, embeddingDim, baseUrl } = requireEmbeddings();
    _client = new OpenAI({ apiKey, baseURL: baseUrl, maxRetries: 0, timeout: 60_000 });
    _model = embeddingModel;
    _dim = embeddingDim;
  }
  return { openai: _client, model: _model, dim: _dim };
}

function assertDim(vec: number[], dim: number): number[] {
  if (vec.length !== dim) {
    throw new Error(
      `Embedding dimension mismatch: expected ${dim}, got ${vec.length}. ` +
        `Check EMBEDDING_MODEL / EMBEDDING_DIM.`,
    );
  }
  return vec;
}

/** Embed a single string into a `embeddingDim`-length vector. */
export async function embedText(text: string): Promise<number[]> {
  const { openai, model, dim } = client();
  // `dimensions` pins the output length: text-embedding-3-* and Gemini's
  // gemini-embedding-001 (via the OpenAI-compat endpoint) both honour it.
  const res = await withRateLimitRetry(
    () => openai.embeddings.create({ model, input: text, dimensions: dim }),
    "embedText",
  );
  return assertDim(res.data[0].embedding, dim);
}

/**
 * Embed many strings in one request (preserves order). OpenAI returns each
 * datum with its `index`; we sort by it defensively before mapping. Gemini's
 * OpenAI-compat endpoint omits `index` (order is positional), so treat a
 * missing index as "already in order".
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { openai, model, dim } = client();
  const res = await withRateLimitRetry(
    () => openai.embeddings.create({ model, input: texts, dimensions: dim }),
    "embedBatch",
  );
  const ordered = [...res.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return ordered.map((d) => assertDim(d.embedding, dim));
}
