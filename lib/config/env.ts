import { z } from "zod";

/**
 * Typed env loader.
 *
 * IMPORTANT: this module must NEVER throw at import time. Several vars are
 * intentionally blank until the feature that needs them runs (the project is
 * built "keys-later": Anthropic + OpenAI keys land after the code does). So
 * `npm run build` and any import path must succeed with those vars empty.
 *
 * Each accessor below validates ONLY its own group, lazily, and throws a
 * clear, actionable error the moment it is called without the vars it needs.
 */

const nonEmpty = z.string().trim().min(1);

/** Parse `shape` against process.env-derived `values`; throw a friendly error. */
function parseGroup<T extends z.ZodTypeAny>(
  group: string,
  schema: T,
  values: Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid/missing env for "${group}". Fix .env.local (see .env.example):\n${issues}`,
    );
  }
  return result.data;
}

// --- Non-secret config with safe defaults — read at CALL TIME ----------------
// IMPORTANT: these MUST be read inside the accessors, never as module-level
// consts. tsx scripts call dotenv.config() in their module body, which runs
// AFTER these imports are evaluated (ESM hoisting) — a module-level const would
// freeze to its default and silently ignore .env.local overrides.
// Generation moved from Anthropic to OpenAI (see DEVIATIONS.md #4); the same
// OPENAI_API_KEY powers both generation and embeddings.
const genModel = () => process.env.OPENAI_GEN_MODEL?.trim() || "gpt-4.1";
const embedModel = () => process.env.EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const embedDim = () => Number(process.env.EMBEDDING_DIM?.trim() || "1536");

// --- Lazy, grouped accessors -------------------------------------------------

const supabaseServiceSchema = z.object({
  url: nonEmpty.url(),
  serviceRoleKey: nonEmpty,
});

/** Server-only Supabase config (service-role key). Throws if not configured. */
export function requireSupabaseService() {
  return parseGroup("supabase (service role)", supabaseServiceSchema, {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

const supabaseBrowserSchema = z.object({
  url: nonEmpty.url(),
  anonKey: nonEmpty,
});

/** Browser Supabase config (anon key). Throws if not configured. */
export function requireSupabaseBrowser() {
  return parseGroup("supabase (browser/anon)", supabaseBrowserSchema, {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

const generationSchema = z.object({ apiKey: nonEmpty, model: nonEmpty });

/** OpenAI config for all LLM generation. Throws if not configured. */
export function requireGeneration() {
  return parseGroup("openai (generation)", generationSchema, {
    apiKey: process.env.OPENAI_API_KEY,
    model: genModel(),
  });
}

const embeddingsSchema = z.object({
  apiKey: nonEmpty,
  embeddingModel: nonEmpty,
  embeddingDim: z.number().int().positive(),
});

/** OpenAI config for embeddings. Same key as generation. Throws if not configured. */
export function requireEmbeddings() {
  return parseGroup("openai (embeddings)", embeddingsSchema, {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: embedModel(),
    embeddingDim: embedDim(),
  });
}

/** Direct Postgres URL for migrations + tsx scripts. Throws if not configured. */
export function requireDbUrl() {
  return parseGroup("database url", z.object({ url: nonEmpty }), {
    url: process.env.SUPABASE_DB_URL,
  }).url;
}

/** Report which feature groups are currently configured (for health/dashboard). */
export function envStatus() {
  const ok = (fn: () => unknown) => {
    try {
      fn();
      return true;
    } catch {
      return false;
    }
  };
  return {
    supabaseService: ok(requireSupabaseService),
    supabaseBrowser: ok(requireSupabaseBrowser),
    generation: ok(requireGeneration),
    embeddings: ok(requireEmbeddings),
    dbUrl: ok(requireDbUrl),
  };
}
