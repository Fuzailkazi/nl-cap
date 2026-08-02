/**
 * Bounded retry for provider 429s, shared by generation (lib/llm/) and
 * embeddings (lib/rag/embed.ts).
 *
 * Gemini's free tier enforces two different kinds of 429 and they need
 * opposite responses:
 *   - per-MINUTE throttling (embeddings meter per input, ~100/min) — the
 *     provider suggests a short delay and retrying is exactly right.
 *   - per-DAY caps (generate_content is `GenerateRequestsPerDayPerProject-
 *     PerModel-FreeTier`) — retrying cannot help, and sleeping through it just
 *     hangs the caller.
 *
 * We tell them apart by the provider's own suggested delay: short enough to be
 * a rate window, we wait; longer than MAX_BACKOFF_MS, we surface an actionable
 * error immediately. That preserves the intent behind the OpenAI clients'
 * `maxRetries: 0` (never sleep through a long backoff) while still letting a
 * bulk ingest or eval sweep ride out ordinary throttling.
 */

const MAX_ATTEMPTS = 6;
const MAX_BACKOFF_MS = 90_000;

/** Pull a retry delay out of a Retry-After header or the provider's message. */
export function retryDelayMs(err: unknown): number | null {
  const e = err as { headers?: Record<string, string> | Headers; message?: string };
  const raw =
    e?.headers instanceof Headers
      ? e.headers.get("retry-after")
      : (e?.headers as Record<string, string> | undefined)?.["retry-after"];
  if (raw != null && raw !== "" && Number.isFinite(Number(raw))) return Number(raw) * 1000;
  // Gemini puts it in the message body: "Please retry in 56.617162381s."
  const m = /retry in ([\d.]+)\s*s/i.exec(String(e?.message ?? ""));
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

/** True when the 429 looks like a per-day/plan cap rather than a rate window. */
function isHardQuota(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  if (/PerDay|per day|daily/i.test(msg)) return true;
  const delay = retryDelayMs(err);
  return delay != null && delay > MAX_BACKOFF_MS;
}

export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  label = "request",
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 429) throw err;

      if (isHardQuota(err)) {
        throw new Error(
          `${label}: provider daily/plan quota exhausted — retrying cannot clear this. ` +
            `Enable billing or switch to a model with remaining quota ` +
            `(GEMINI_GEN_MODEL / EMBEDDING_MODEL). Original: ${(err as Error).message}`,
        );
      }
      if (attempt >= MAX_ATTEMPTS) throw err;

      const wait = retryDelayMs(err) ?? Math.min(2 ** attempt * 1_000, 30_000);
      // +1s of margin: the provider's window edge is not exactly our clock's.
      await new Promise((r) => setTimeout(r, wait + 1_000));
    }
  }
}
