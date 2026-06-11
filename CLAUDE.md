# CLAUDE.md — Mutual Fund Advisor Intelligence Suite

> This file is a **binding contract**. Every agent (and human) working in this
> repo MUST obey it. Only explicit user instructions in chat can override it,
> and any override must be logged in docs/DEVIATIONS.md with a one-line
> reason. When in doubt, comply with the stricter rule. Evals encode these
> rules as pass/fail checks — drifting from a format below will fail
> `npm run eval:all`.

## What this is
Capstone: voice-first mutual fund assistant. Three pillars (FAQ RAG bot,
Review Intelligence, Voice Scheduler) + Approval Centre + MCP layer + evals.

## Non-negotiable product rules (compliance)
- FAQ answers: ≤3 sentences, exactly ONE citation link, no performance
  claims, no investment advice. Advice requests → the verbatim advice
  refusal string below.
- Never fabricate facts. If the corpus has no answer, use the verbatim
  corpus-miss string below.
- No PII anywhere: not in prompts, logs, pulses, transcripts, or quotes.
  Voice agent deflects volunteered PII with the verbatim deflection string
  below and never stores or echoes the volunteered detail.
- All MCP actions are queued as `pending` and execute only after explicit
  human approval in the Approval Centre. No auto-send, ever.

## Refusal message strings (use VERBATIM — evals match on these exact strings)
- **Advice refusal:**
  "I can't provide investment advice or recommendations. For unbiased
  investor education, please visit AMFI:
  https://www.amfiindia.com/"
- **Corpus miss:**
  "I don't have a verified source for that yet. Would you like to book a
  call with an advisor who can help?"
- **PII deflection (voice):**
  "For your security, please don't share personal details on this call.
  You can submit them safely through the secure link in your booking
  confirmation."

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

## Subagent boundaries (file ownership — do not cross)
> These are a structural/discipline map for who owns what. They are NOT
> wired as formal `.claude/agents/` definitions (see DEVIATIONS.md #2); the
> main thread acts as integrator and may dispatch ephemeral subagents for
> bounded, independent chunks within these boundaries.
- **rag-engineer** owns `lib/rag/`, the corpus schema/migrations, the
  ingestion script, `data/source-manifest.json`, and the M1 FAQ route.
- **review-analyst** owns the reviews pipeline, pulse + fee-explainer
  generation, and `data/reviews.csv`. It calls rag-engineer's
  `refreshCorpus()` — it never edits retrieval code or the corpus schema.
- **voice-scheduler** owns the scheduler UI/route, intents, booking codes,
  and TTS/STT. It reads pulse rows; it never writes them.
- **mcp-orchestrator** is the ONLY agent that touches `mcp/`, the
  approval_queue, and the backing stores (shared_doc_entries,
  calendar_holds, email_drafts).
- **eval-compliance** owns `evals/` and docs/EVAL_LOG.md. It imports prompts
  from `lib/llm/` read-only; it never edits pillar code — it reports
  failures for the owning agent to fix.
- Shared files (`lib/llm/`, `lib/db/`, dashboard shell): main thread only.

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
  (Original spec said Next 14; deps were bumped to latest on request — see
  DEVIATIONS.md #1.)
- **Supabase** Postgres + pgvector. Migrations in `supabase/migrations/`.
- **LLM generation**: OpenAI API, model `gpt-4.1` (env `OPENAI_GEN_MODEL`).
  (Originally Anthropic `claude-sonnet-4-6`; moved to OpenAI — see
  DEVIATIONS.md #4.)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims, env
  `EMBEDDING_MODEL` / `EMBEDDING_DIM`). OpenAI is now the only LLM vendor —
  one `OPENAI_API_KEY` powers both generation and embeddings.
- **Voice**: Web Speech API (STT) + SpeechSynthesis (TTS) — browser only, no
  paid voice infra.
- **MCP**: 3 tools in `mcp/` (TS SDK). "Shared doc" and "calendar" are
  Supabase tables rendered in the UI, labelled MCP-backed.
- **Evals**: `evals/`, runnable via `npm run eval:*`. Rule-based where
  possible; LLM-as-judge only for faithfulness/relevance. A GitHub Action
  runs `npm run eval:structure` on every push to main.

```
app/        Next.js routes + UI (3 pillars + dashboard + Approval Centre)
lib/        shared code: lib/llm/ (prompts+calls), lib/db/, lib/rag/, config
mcp/        MCP server + the 3 tools
evals/      eval scripts + evals/datasets/ (golden, adversarial, structure)
data/       source-manifest.json, reviews.csv
docs/       ARCHITECTURE.md, PROJECT-PLAN.md, DEVIATIONS.md
supabase/   migrations/
```

## Hard order of operations
No pillar code until the plan + scaffold are reviewed. Build order:
M0 (scaffold/schema) → M1 (FAQ RAG) → M2 (Review Intelligence) →
M3 (Voice Scheduler). MCP + Approval Centre land alongside M1 so every
pillar can queue actions through the same gate.
