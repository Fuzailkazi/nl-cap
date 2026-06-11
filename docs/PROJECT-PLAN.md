# Project Plan — Mutual Fund Advisor Intelligence Suite

## Goal
Ship a demoable, compliance-correct suite: 3 pillars + Approval Centre + MCP +
runnable evals, on one AMC (HDFC MF) and 4 schemes, using only official sources.

## Milestones & Definition of Done

### M0 — Scaffold & schema (this checkpoint)
- Next 16 app, folder structure, Supabase migration, `.env.example`.
- `data/source-manifest.json` (≥30 URLs) + `data/reviews.csv` header.
- Golden + adversarial + structure eval datasets drafted.
- CLAUDE.md contract in place.
- **DoD:** `npm run build` passes; migration applies cleanly; review approved.

### M1 — FAQ RAG bot + MCP/Approval Centre foundation
- Ingest manifest → chunk → embed (OpenAI) → `corpus`.
- `lib/llm/faqAnswer` (named prompt) → ≤3 sentences, 1 citation, advice
  refusal, corpus-miss message; Zod-validated, retry-once.
- MCP server (3 tools, enqueue-only) + Approval Centre UI + `email_draft_generate`
  wired so FAQ can draft a follow-up email through the gate.
- **DoD (per CLAUDE.md):** golden-dataset citation accuracy passes; advice
  refusal works. `npm run eval:rag` + `eval:adversarial` green.

### M2 — Review Intelligence
- CSV ingest → `reviews`. `lib/llm/weeklyPulse` + `lib/llm/feeExplainer`.
- Fee Explainer inserted to `corpus` as `doc_type='fee_explainer'`; Reviews UI
  shows the visible "refresh corpus" action + re-query demo.
- **DoD:** pulse + explainer pass structure eval; explainer retrievable by M1.

### M3 — Voice Scheduler
- Web Speech STT booking → `KV-XNNN` code, SpeechSynthesis reads it aloud.
- Greeting interpolates latest `pulses.top_theme`. Volunteered PII deflected.
- Booking code appended to a `notes_doc_append` action in the queue.
- **DoD:** greeting contains top theme; code generated, read aloud, visible in
  the queued notes action. `npm run eval:structure` green.

### M4 — Dashboard + eval polish (stretch)
- Unified dashboard across pillars + `eval_runs` history. Full `eval:all` pass.

## Build order rationale
MCP + Approval Centre land in **M1** (not last) so every later pillar reuses
the same enqueue→approve path instead of bolting it on.

## Risks / watch-items
- **Stack drift:** now Next 16 / React 19 (spec said 14) — async `cookies()`/
  `headers()`, caching defaults, React 19 semantics.
- **Source-URL verification:** manifest deep links are *seeded* with
  `last_checked: null`; ingestion MUST fetch + stamp before trusting them.
- **LLM vendor:** OpenAI is now the only LLM vendor — generation (`gpt-4.1`,
  env `OPENAI_GEN_MODEL`) and embeddings (`text-embedding-3-small`, 1536 dims).
  Generation was moved off Anthropic (see docs/DEVIATIONS.md #4). Swappable via env.
- **PII in real reviews:** scrub at ingest; never persist raw PII.

## Eval matrix (what proves each rule)
| Eval (`npm run`) | Proves |
|---|---|
| `eval:rag` | faithfulness ≥0.8, relevance ≥0.8, citation accuracy (5 Qs) |
| `eval:adversarial` | 5/5 correct refusals (advice / PII / out-of-scope) |
| `eval:structure` | pulse counts, fee bullets/links/stamp, greeting theme, code in notes, market context in email |
| `eval:all` | runs all three, writes `eval_runs` |
