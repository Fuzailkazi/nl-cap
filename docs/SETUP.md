# Setup — local environment & credentials

What you need to provide before real (non-mock) work can run. All secrets go in
`.env.local` (gitignored). The variable names live in `.env.example`.

## 1. Copy the env template

```bash
cp .env.example .env.local
```

Then fill in the values below.

## 2. Supabase (Postgres + pgvector)

1. Create a project at https://supabase.com (free tier is fine).
2. Settings → API: copy
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
3. Settings → Database: copy the **connection string** → `SUPABASE_DB_URL`.
4. pgvector is enabled by the first migration (`create extension vector`); the
   project just needs to exist.

> No Supabase yet? You can build/test against local Postgres+pgvector via Docker
> and swap the connection string later — ask and I'll set that path up.

## 3. Gemini (LLM generation AND embeddings)

A single Gemini key powers both generation and embeddings through Google's
OpenAI-compatible endpoint (see docs/DEVIATIONS.md #4 and #8 — generation
moved Anthropic → OpenAI → Gemini).

1. Get a key at https://aistudio.google.com/apikey → `GEMINI_API_KEY`.
2. Set `GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`
   (blank = talk to api.openai.com directly with an OpenAI key instead).
3. `GEMINI_GEN_MODEL` defaults to `gemini-2.5-flash` (generation).
4. Leave `EMBEDDING_MODEL=gemini-embedding-001` and `EMBEDDING_DIM=1536`
   unless intentionally changing the vector dimension (must match the
   migration). If you change EMBEDDING_MODEL, re-run `npm run ingest` +
   `npm run reviews` — the vector space changes.
5. Confirm the key has quota — generation + embedding calls cost a small amount.

> Anthropic is no longer required. `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`
> remain in the template only to ease reverting the swap.

## What is NOT needed

- No HDFC/AMFI/SEBI logins — sources are public.
- No paid voice infrastructure — voice is browser-only Web Speech API.
- You never need to paste key *values* into chat; set them in `.env.local`
  yourself and the code references them by name.

## Verify

Once `.env.local` is filled in:

```bash
npm install
npm run build   # should pass once M0 scaffold lands
```
