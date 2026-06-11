import OpenAI from "openai";
import { requireGeneration } from "@/lib/config/env";

/**
 * Single OpenAI client for all LLM GENERATION (faqAnswer, weeklyPulse,
 * feeExplainer, voice greeting). Embeddings have their own client in lib/rag.
 * Lazily constructed so importing this never fails when the key is blank.
 */
let _client: OpenAI | null = null;

export function generationClient(): { client: OpenAI; model: string } {
  const { apiKey, model } = requireGeneration();
  if (!_client) _client = new OpenAI({ apiKey });
  return { client: _client, model };
}
