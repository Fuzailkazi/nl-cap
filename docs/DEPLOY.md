# Deploy — Vercel (GitHub import)

The repo deploys as a stock Next.js 16 app. There is no build-time secret
requirement: `lib/config/env.ts` is lazy, so the build succeeds with every key
blank and each route only throws when it is actually called without its group's
vars. That means a misconfigured env shows up as a failing route, never as a
failed build — check the runtime logs, not the build log.

## 1. Import

1. Push `main` (already done — `github.com/Fuzailkazi/nl-cap`).
2. Vercel dashboard → **Add New… → Project** → import `Fuzailkazi/nl-cap`.
3. Framework preset auto-detects **Next.js**. Leave build command, output
   directory, and install command at their defaults.

## 2. Environment variables

Set these under **Settings → Environment Variables** for *Production* (and
*Preview* if you want PR deploys to work). Values come from your local
`.env.local` — copy them across; do not paste them into chat.

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL | corpus, reviews, pulses, approval queue |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | server-only DB access (`serviceClient()`) |
| `GEMINI_API_KEY` | your Gemini key | generation **and** embeddings |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` | routes the OpenAI SDK at Gemini |
| `GEMINI_GEN_MODEL` | `gemini-2.5-flash` | generation model |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | must match what the corpus was embedded with |
| `EMBEDDING_DIM` | `1536` | must match `vector(1536)` in `0001_init.sql` |

`GEMINI_GEN_MODEL`, `EMBEDDING_MODEL`, and `EMBEDDING_DIM` have correct Gemini
defaults in `lib/config/env.ts`, so they are technically optional — set them
anyway so the deployed config is explicit rather than implicit.

### Not required on Vercel

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `browserClient()` in `lib/db/index.ts` is
  currently unreferenced; nothing in `app/` or `components/` calls it.
- `SUPABASE_DB_URL` — only `requireDbUrl()` reads it, and that is used solely by
  local migration/tsx tooling, not by any route.
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` — deprecated (DEVIATIONS.md #4).

## 3. Before the deploy is meaningful

The data pipelines are **not** run by Vercel — they are local `tsx` scripts that
write to Supabase. The deployed app reads whatever is already in the database.
So with a fresh or re-keyed corpus you must run these locally first:

```bash
npm run ingest    # embeds source-manifest.json URLs into corpus (pgvector)
npm run reviews   # reviews.csv → reviews → pulse + fee explainer → corpus
npm run eval:all  # retrieval → generation → compliance → injection → structure
```

**Re-run `ingest` + `reviews` after any `EMBEDDING_MODEL` change.** Embeddings
from different models occupy different vector spaces; querying a
`text-embedding-3-small` corpus with a `gemini-embedding-001` query vector
returns plausible-looking but effectively random neighbours, and retrieval
degrades silently — no error is raised.

## 4. Post-deploy smoke check

Hit each pillar once on the deployed URL:

- `/faq` — ask a question covered by the corpus; confirm the answer carries
  exactly one citation link.
- `/faq` — ask for a recommendation; confirm the verbatim advice-refusal string.
- `/reviews` — confirm the weekly pulse and fee explainer render.
- `/voice` — confirm the greeting interpolates the current pulse top theme.
- `/approvals` — confirm queued actions appear as `pending` and nothing
  auto-executes.

If a route 500s, read the Vercel function logs: a missing env var surfaces as
the `Invalid/missing env for "<group>"` message from `parseGroup()`, which names
the exact group that is unconfigured.
