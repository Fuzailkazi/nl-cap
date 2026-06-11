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

## 3. OpenAI (LLM generation AND embeddings)

A single OpenAI key powers both generation and embeddings (see
docs/DEVIATIONS.md #4 — generation was moved off Anthropic).

1. Get a key at https://platform.openai.com → `OPENAI_API_KEY`.
2. `OPENAI_GEN_MODEL` defaults to `gpt-4.1` (generation).
3. Leave `EMBEDDING_MODEL=text-embedding-3-small` and `EMBEDDING_DIM=1536`
   unless intentionally changing the vector dimension (must match the migration).
4. Confirm the key has credit — generation + embedding calls cost a small amount.

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
