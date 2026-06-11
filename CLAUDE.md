# CLAUDE.md — Mutual Fund Advisor Intelligence Suite

> This file is a **binding contract**. Every agent (and human) working in this
> repo MUST obey it. User instructions in a given session can override it, but
> nothing in normal autonomous work may. When in doubt, comply with the
> stricter rule. Evals encode these rules as pass/fail checks — drifting from a
> format below will fail CI.

## What this is
Capstone: voice-first mutual fund assistant. Three pillars (FAQ RAG bot,
Review Intelligence, Voice Scheduler) + Approval Centre + MCP layer + evals.

## Non-negotiable product rules (compliance)
- FAQ answers: ≤3 sentences, exactly ONE citation link, no performance
  claims, no investment advice. Advice requests → polite refusal + AMFI
  education link (https://www.amfiindia.com/investor-corner).
- Never fabricate facts. If the corpus has no answer: "I don't have a
  verified source for that yet" + offer to book an advisor call.
- No PII anywhere: not in prompts, logs, pulses, transcripts, or quotes.
  Voice agent deflects volunteered PII to the secure link message.
- All MCP actions are queued as `pending` and execute only after explicit
  human approval in the Approval Centre. No auto-send, ever.

## Output format contracts (evals depend on these — do not drift)
- Weekly Pulse: ≤250 words, sections = Top Themes / User Quotes (≥1) /
  Key Observation / Action Ideas (exactly 3).
- Fee Explainer: exactly 6 bullets, neutral tone, exactly 2 official source
  links, ends with "Last checked: YYYY-MM-DD".
- Booking Code: `KV-` + letter + 3 digits, e.g. KV-B391.
  Canonical regex: `^KV-[A-Z][0-9]{3}$`.
- Voice greeting template MUST interpolate the current pulse top theme.

## Architecture invariants
- Single RAG corpus table (pgvector). Fee Explainers are inserted as corpus
  documents with doc_type='fee_explainer' — that IS the refresh mechanism.
- Voice scheduler reads the latest pulse row to build its greeting.
- MCP tools: notes_doc_append, calendar_hold_create, email_draft_generate.
  Each returns a queued action id, never a completed side effect.

## Scope limits (do not exceed)
- One AMC, 3–5 schemes. 30–50 reviews. Mock calendar slots are fine.

## Conventions
- TypeScript strict. Zod-validate all LLM JSON outputs; retry once on
  validation failure, then surface the error — never silently accept
  malformed output.
- Every LLM call lives in lib/llm/ with its prompt in a named export so
  evals can import the same prompt.
- Commit after each working milestone with a descriptive message.

## Definition of done per milestone
- M1: golden-dataset citation accuracy passes; advice refusal works.
- M2: pulse + explainer pass the structure eval; explainer retrievable by M1.
- M3: greeting contains top theme; booking code generated, read aloud, and
  visible in the queued notes_doc_append action.

---

## Stack & repo layout (reference — see docs/ARCHITECTURE.md for detail)
- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript (strict) +
  Tailwind v4 (CSS-first, `@tailwindcss/postcss`). Deploy: Vercel.
  (Note: original spec said Next 14; deps were bumped to latest on request.)
- **Supabase** Postgres + pgvector. Migrations in `supabase/migrations/`.
- **LLM generation**: Anthropic API, model `claude-sonnet-4-6` (env
  `ANTHROPIC_MODEL`).
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims, env
  `EMBEDDING_MODEL` / `EMBEDDING_DIM`). This is the one non-Anthropic vendor.
- **Voice**: Web Speech API (STT) + SpeechSynthesis (TTS) — browser only, no
  paid voice infra.
- **MCP**: 3 tools in `mcp/` (TS SDK). "Shared doc" and "calendar" are
  Supabase tables rendered in the UI, labelled MCP-backed.
- **Evals**: `evals/`, runnable via `npm run eval:*`. Rule-based where
  possible; LLM-as-judge only for faithfulness/relevance.

```
app/        Next.js routes + UI (3 pillars + dashboard + Approval Centre)
lib/        shared code: lib/llm/ (prompts+calls), lib/db/, lib/rag/, config
mcp/        MCP server + the 3 tools
evals/      eval scripts + evals/datasets/ (golden, adversarial, structure)
data/       source-manifest.json, reviews.csv
docs/       ARCHITECTURE.md, PROJECT-PLAN.md
supabase/   migrations/
```

## Hard order of operations
No pillar code until the plan + scaffold are reviewed. Build order:
M0 (scaffold/schema) → M1 (FAQ RAG) → 
 (Review Intelligence) →
M3 (Voice Scheduler). MCP + Approval Centre land alongside M1 so every
pillar can queue actions through the same gate.

## Refusal message strings (use verbatim — evals match on them)
- Advice: a polite decline + the AMFI education link above.
- Corpus miss: "I don't have a verified source for that yet" + offer to book a call.
- Volunteered PII (voice): deflect to the secure-link message; never store it.
