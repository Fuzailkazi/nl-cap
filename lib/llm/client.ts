import OpenAI from "openai";
import { requireGeneration } from "@/lib/config/env";

/**
 * Single OpenAI client for all LLM GENERATION (faqAnswer, weeklyPulse,
 * feeExplainer, voice greeting). Embeddings have their own client in lib/rag.
 * Lazily constructed so importing this never fails when the key is blank.
 */
let _client: OpenAI | null = null;

export function generationClient(): { client: OpenAI; model: string } {
  const { apiKey, model, baseUrl } = requireGeneration();
  // maxRetries: 0 so a 429 (e.g. daily-cap with a long Retry-After) surfaces
  // immediately instead of the SDK sleeping through the backoff and hanging.
  // baseURL undefined = api.openai.com; set GEMINI_BASE_URL for any
  // OpenAI-compatible vendor (currently Gemini — DEVIATIONS.md #8).
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: baseUrl, maxRetries: 0, timeout: 60_000 });
  }
  return { client: _client, model };
}
