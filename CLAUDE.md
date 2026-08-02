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

## Commands
```bash
npm run dev            # Next.js dev server (Turbopack) on :3000
npm run build          # production build — MUST pass with blank keys (env is lazy)
npm run lint           # eslint (eslint-config-next)

# Data pipelines (tsx scripts, load .env.local; need GEMINI_API_KEY + Supabase)
npm run ingest         # embed data/source-manifest.json URLs → corpus (pgvector)
npm run ingest:dry     # ingest without writing (fetch/chunk/embed dry-run)
npm run reviews        # data/reviews.csv → reviews table → pulse + fee explainer
npm run mcp            # start the MCP server (mcp/server.ts)

# Evals — one CLI (evals/run.ts) dispatches every suite. `all` runs the 5 in order.
npm run eval:all       # retrieval → generation → compliance → injection → structure
npm run eval:retrieval # RAG recall/citation over evals/datasets/golden.json
npm run eval:generation# faithfulness/relevance (LLM-as-judge) — needs GEMINI_API_KEY
npm run eval:compliance# advice refusal / corpus miss / no-PII (rule-based)
npm run eval:injection # prompt-injection resistance over datasets/injection.json
npm run eval:structure # pulse/fee-explainer/greeting/booking-code format checks
# Back-compat aliases still work: eval:rag → generation, eval:adversarial → compliance.
```
No unit-test runner: correctness is enforced by the eval suites above (rule-based
where possible; LLM-as-judge only for faithfulness/relevance). To run one suite
directly: `tsx evals/run.ts <suite>`. Evals record a row in `eval_runs` when
Supabase is configured, and skip that write silently otherwise.

## Codebase map (where things actually live)
- **Shared contracts** — `lib/contracts.ts` is the single source of truth for
  every cross-pillar type, Zod schema, the verbatim refusal strings
  (`ADVICE_REFUSAL` / `CORPUS_MISS` / `PII_DEFLECTION`), `BOOKING_CODE_REGEX`,
  `detectPII()`, and the `assemble*Body/Content` renderers evals check against.
  Change a format here, not in scattered call sites.
- **Env** — `lib/config/env.ts`: lazy, grouped accessors (`requireGeneration`,
  `requireEmbeddings`, `requireSupabase*`, `requireDbUrl`). NEVER throws at
  import time; each throws only when its group is used with missing vars. Read
  config inside accessors, never as module-level consts (tsx `dotenv.config()`
  runs after import hoisting). `.env.example` lists every var.
- **LLM calls + prompts** — `lib/llm/{faqAnswer,weeklyPulse,feeExplainer}.ts`.
  Each prompt is a named export (`*_SYSTEM_PROMPT`) so evals import the exact
  production prompt. `client.ts` = one OpenAI generation client (`maxRetries:0`).
  `faqAnswer.enforceContract()` is what actually guarantees verbatim refusals
  and downgrades an uncited answer to a corpus miss.
- **RAG** — `lib/rag/`: `embed.ts`, `ingest.ts`, `retrieve.ts`, `refresh.ts`
  (`refreshCorpus()` — the review-analyst calls this; it never edits retrieval).
- **MCP / approval gate** — `lib/mcp/{tools,queue,execute}.ts` + `mcp/server.ts`.
  Every tool ENQUEUES to `approval_queue` (status `pending`) and returns an
  action id; side-effect tables are written only on approve. No auto-execute path.
- **Voice** — `lib/voice/scheduler.ts`: `buildGreeting(topTheme)`,
  `generateBookingCode()`, `spellCodeForSpeech()`, `MOCK_SLOTS`.
- **DB** — `lib/db/index.ts`: `serviceClient()` (server) / `browserClient()`.
  Tables (`supabase/migrations/0001_init.sql`): `corpus`, `reviews`, `pulses`,
  `bookings`, `approval_queue`, `mcp_notes_docs`, `calendar_holds`,
  `email_drafts`, `eval_runs`.
- **UI** — `app/` routes (faq, reviews, voice, approvals, dashboard) + `app/api/*`
  route handlers; presentational components in `components/` (`ui/` primitives,
  then per-pillar folders).

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
- **LLM generation**: Gemini via Google's OpenAI-compatible endpoint
  (`GEMINI_BASE_URL`), model `gemini-2.5-flash` (env `GEMINI_GEN_MODEL`).
  (Originally Anthropic `claude-sonnet-4-6` → OpenAI `gpt-4.1` → Gemini —
  see DEVIATIONS.md #4 and #8.)
- **Embeddings**: Gemini `gemini-embedding-001` pinned to 1536 dims via the
  `dimensions` param (env `EMBEDDING_MODEL` / `EMBEDDING_DIM`), same
  OpenAI-compatible endpoint. One vendor, one `GEMINI_API_KEY` (holds the
  Gemini key) powers both generation and embeddings. Changing
  `EMBEDDING_MODEL` changes the vector space — re-run `npm run ingest` +
  `npm run reviews` after any switch.
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
