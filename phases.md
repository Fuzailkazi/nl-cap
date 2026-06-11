# PHASES — Mutual Fund Advisor Intelligence Suite

> Working tracker for the whole build. Source of truth for *what's done* and
> *what's next*. Rules come from `CLAUDE.md` (binding contract); design from
> `docs/ARCHITECTURE.md`; milestone intent from `docs/PROJECT-PLAN.md`.

---

## 1. What we're building (one paragraph)

A **voice-first, facts-only** mutual fund support assistant for **one AMC
(HDFC MF) and 4 schemes**. It has three user-facing pillars on top of two shared
pieces of plumbing. The plumbing: (1) a **single pgvector `corpus` table** every
RAG feature reads/writes, and (2) a **pending-action queue + Approval Centre**
that every side-effecting action must pass through — nothing auto-sends, ever.
The three pillars: a **FAQ RAG bot**, **Review Intelligence** (Weekly Pulse +
Fee Explainer), and a **Voice Scheduler**. Compliance rules (≤3 sentences, one
citation, no advice, no PII, exact refusal strings) are enforced in code and
**proven by runnable evals** — the evals *are* the spec.

### The two spines
- **Corpus table** — chunk → embed (OpenAI) → store. Fee Explainers are
  *inserted back* as `doc_type='fee_explainer'` — that insert IS the "refresh"
  mechanism; the FAQ bot picks them up with zero code change.
- **Approval queue** — MCP tools (`notes_doc_append`, `calendar_hold_create`,
  `email_draft_generate`) only ever enqueue a `pending` row and return an id.
  Side-effect tables are written *only* on human approval.

### Three invariant data flows (must hold)
- **(A)** Fee Explainer → `corpus` row → retrievable by FAQ bot.
- **(B)** Latest `pulses.top_theme` → interpolated into voice greeting.
- **(C)** Every MCP call → `approval_queue (pending)` → side effect only on approve.

---

## 2. Non-negotiable contracts (evals match these — do not drift)

| Output | Contract |
|---|---|
| FAQ answer | ≤3 sentences, **exactly one** citation link, no performance claims, no advice |
| Advice request | polite refusal + AMFI link `https://www.amfiindia.com/` (was `/investor-corner` — 404; see DEVIATIONS #5) |
| Corpus miss | exact string: *"I don't have a verified source for that yet"* + offer to book a call |
| Weekly Pulse | ≤250 words; sections = Top Themes / User Quotes (≥1) / Key Observation / Action Ideas (exactly 3) |
| Fee Explainer | exactly 6 bullets, neutral tone, exactly 2 official links, ends `Last checked: YYYY-MM-DD` |
| Booking code | `KV-` + letter + 3 digits; regex `^KV-[A-Z][0-9]{3}$` (e.g. `KV-B391`) |
| Voice greeting | MUST interpolate current pulse top theme |
| PII | none anywhere — prompts, logs, pulses, transcripts, quotes; voice deflects volunteered PII |
| LLM JSON | Zod-validate → retry once → surface error; never silently accept malformed |

---

## 3. Current state (✅ done so far)

- [x] Project contract `CLAUDE.md`
- [x] Planning docs `docs/PROJECT-PLAN.md`, `docs/ARCHITECTURE.md`
- [x] Dependencies set (Next 16, React 19, Anthropic SDK, MCP SDK, Supabase, OpenAI, csv-parse, zod, tsx, dotenv)
- [x] Tailwind v4 migration (CSS-first, `@tailwindcss/postcss`)
- [x] Data seeds: `data/source-manifest.json` (32 URLs), `data/reviews.csv` (header + 1 sample row)
- [x] Folder skeleton: `lib/{llm,db,rag}/`, `mcp/`, `evals/datasets/`, `supabase/migrations/`
- [x] `.env.example` template + `.gitignore` hardened (`.env` ignored, `.env.example` kept)
- [x] `docs/SETUP.md` credential checklist
- [x] `.env.local` created with Supabase URL + secret key; REST endpoint verified reachable (HTTP 200)

---

## 4. Credentials / setup status

| Credential | Var | Status |
|---|---|---|
| Supabase project URL | `NEXT_PUBLIC_SUPABASE_URL` | ✅ set (`brklopundnquyghrevmy`) |
| Supabase secret/service key | `SUPABASE_SERVICE_ROLE_KEY` | ✅ set (⚠️ rotate after capstone — pasted in chat) |
| Supabase anon/publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⬜ needed for browser client |
| Supabase DB connection string | `SUPABASE_DB_URL` | ✅ set (session pooler, ap-southeast-2) — migration applied |
| OpenAI key | `OPENAI_API_KEY` | ✅ set (powers **generation + embeddings**; ⚠️ pasted in chat — rotate after capstone) |
| OpenAI gen model | `OPENAI_GEN_MODEL` | ✅ `gpt-4.1` (default) |
| Anthropic key | `ANTHROPIC_API_KEY` | ⬜ deprecated — generation moved to OpenAI (DEVIATIONS.md #4) |

---

## 5. Phases & tasks

Build order is **hard** (per CLAUDE.md): M0 → M1 → M2 → M3 → M4. No pillar code
until M0 scaffold + schema are reviewed. MCP + Approval Centre land in **M1**.

### M0 — Scaffold & schema  *(in progress)*
- [x] Folder structure + env scaffold (see §3)
- [x] **Decided:** real Supabase (cloud) — connected via session pooler
- [x] **Schema migration** `supabase/migrations/0001_init.sql`:
  - [x] `create extension vector` (pgvector 0.8.0)
  - [x] `corpus` (id, doc_type, scheme, title, url, content, `embedding vector(1536)`, last_checked, created_at) + hnsw cosine index
  - [x] `reviews` (review_id, review_date, scheme, channel, rating, title, text, language)
  - [x] `pulses` (id, created_at, top_theme, body, word_count)
  - [x] `bookings` (id, code, slot, created_at) — code CHECK `^KV-[A-Z][0-9]{3}$`
  - [x] `approval_queue` (id, tool, payload jsonb, status pending/approved/rejected, result, created_at, decided_at)
  - [x] side-effect tables: `mcp_notes_docs`, `calendar_holds`, `email_drafts`
  - [x] `eval_runs` (id, suite, passed, score, detail jsonb, created_at)
- [x] Apply migration; confirmed clean (9 tables live)
- [x] `lib/db/` — Supabase clients (lazy `serviceClient()` + `browserClient()`)
- [x] `lib/config` — typed env loader (`lib/config/env.ts`; lazy grouped `require*()` accessors, never throws at import)
- [x] Eval datasets drafted: `evals/datasets/{golden,adversarial,structure}.json`
- [x] `eval:rag` / `eval:adversarial` / `eval:structure` / `eval:all` scripts added to `package.json` (runner `evals/run.ts`; M0 shape-validates + runs rule-based checks, marks prompt checks pending; `eval:all` green, writes `eval_runs`)
- [x] **DoD:** `npm run build` passes (Next 16, TS strict clean); migration applied; verbatim refusal strings reconciled into `CLAUDE.md`; deviations logged in `docs/DEVIATIONS.md`
- [ ] **Known issue (deferred):** `npm run lint` broken — `next lint` removed in Next 16; needs ESLint flat-config migration (tracked under stack-drift, not an M0 blocker)
- [x] Commit checkpoint

### M1 — FAQ RAG bot + MCP / Approval Centre foundation
- [ ] **Ingestion pipeline** (`lib/rag/` + a `tsx` script):
  - [ ] Fetch each manifest URL, verify it resolves to the real doc, **stamp `last_checked`** (never embed unverified — decide skip/replace/mock for dead links)
  - [ ] Chunk documents (strategy per doc_type: PDF factsheet vs webpage)
  - [ ] Embed via OpenAI `text-embedding-3-small` (1536)
  - [ ] Upsert into `corpus`
  - [ ] Similarity query function (top-k retrieve)
- [ ] **`lib/llm/faqAnswer`** — named prompt export + call:
  - [ ] ≤3 sentences, exactly one citation
  - [ ] advice → refusal + AMFI link
  - [ ] corpus miss → exact "no verified source" string + offer call
  - [ ] no performance claims, no PII
  - [ ] Zod schema + retry-once wrapper
- [ ] **MCP server** (`mcp/`, TS SDK) — 3 tools, **enqueue-only**, each returns action id
- [ ] **`email_draft_generate`** wired so FAQ can draft a follow-up email through the gate
- [ ] **Approval Centre UI** — lists `approval_queue`, approve/reject → executes tool on approve
- [ ] **FAQ chat UI** — renders answer + the single citation
- [ ] Evals: `eval:rag` (faithfulness ≥0.8, relevance ≥0.8, citation accuracy on 5 Qs), `eval:adversarial` (5/5 refusals)
- [ ] **DoD:** golden-dataset citation accuracy passes; advice refusal works; `eval:rag` + `eval:adversarial` green
- [ ] Commit checkpoint

### M2 — Review Intelligence
- [ ] Expand `data/reviews.csv` to **30–50 rows** (4 schemes, varied channels/ratings, **zero PII**)
- [ ] CSV ingest → `reviews` table (`csv-parse`); PII scrub/skip at ingest
- [ ] **`lib/llm/weeklyPulse`** — ≤250 words, Top Themes / Quotes(≥1) / Key Observation / 3 Action Ideas; Zod-validated; writes `pulses` row (incl. `top_theme`)
- [ ] **`lib/llm/feeExplainer`** — exactly 6 bullets, 2 official links, `Last checked: YYYY-MM-DD`; Zod-validated
- [ ] Insert Fee Explainer into `corpus` as `doc_type='fee_explainer'` (flow **A** refresh)
- [ ] **Reviews UI** — show Pulse + Fee Explainer + visible "refresh corpus" action + re-query demo (explainer becomes a citable FAQ source)
- [ ] Evals: `eval:structure` for pulse counts + fee bullets/links/stamp; confirm explainer retrievable by M1
- [ ] **DoD:** pulse + explainer pass structure eval; explainer retrievable by FAQ bot
- [ ] Commit checkpoint

### M3 — Voice Scheduler
- [ ] **`lib/voice/`** — Web Speech API STT + SpeechSynthesis TTS (browser only)
- [ ] Booking flow → generate `KV-XNNN` code (regex `^KV-[A-Z][0-9]{3}$`), write `bookings` row
- [ ] Greeting interpolates **latest `pulses.top_theme`** (flow **B**)
- [ ] TTS reads the booking code aloud
- [ ] Volunteered PII → deflect to secure-link message; never store
- [ ] Booking code appended via **`notes_doc_append`** → visible in `approval_queue`
- [ ] **Typed fallback** so a live demo survives mic/browser flakiness
- [ ] Evals: `eval:structure` asserts greeting contains top theme; code generated + visible in queued notes action
- [ ] **DoD:** greeting contains top theme; code generated, read aloud, visible in queued notes action; `eval:structure` green
- [ ] Commit checkpoint

### M4 — Dashboard + eval polish (stretch)
- [ ] Unified dashboard across the three pillars
- [ ] `eval_runs` history view
- [ ] `eval:all` green end-to-end (writes `eval_runs`)
- [ ] Final UI polish pass
- [ ] Commit checkpoint

---

## 6. Frontend / UX plan

Stack: **Next 16 App Router + React 19 + Tailwind v4 + shadcn/ui** (Radix-based,
accessible primitives generated into the repo, themed with CSS-variable tokens).
Frontend work begins in **M1** (alongside the Approval Centre) and grows each
milestone; final polish is **M4**.

### 6.1 Foundation (build first, in M1)
- [ ] Initialize shadcn/ui (`components.json`, `app/components/ui/`, `lib/utils.ts` `cn()` helper)
- [ ] Design tokens in `globals.css` (Tailwind v4 `@theme`): brand color, neutral scale, radius, font; **light + dark mode** via CSS variables
- [ ] Typography scale + base font (Geist already vendored in `app/fonts/`)
- [ ] Pull core shadcn primitives: `button`, `card`, `dialog`, `table`, `badge`, `input`, `textarea`, `tabs`, `skeleton`, `sonner` (toast), `scroll-area`, `separator`, `tooltip`
- [ ] **App shell** — `app/layout.tsx` with persistent sidebar nav + top header (theme toggle, env/health indicator)
- [ ] **Routing** — `/` dashboard · `/faq` · `/reviews` · `/voice` · `/approvals`
- [ ] Shared **state primitives**: `<LoadingState/>` (skeletons), `<ErrorState/>`, `<EmptyState/>`, toast on action success/failure

### 6.2 Shared component library (build once, reused across pillars)
- [ ] `CitationCard` — renders the **single** official source link (title + url + doc_type badge) — used by FAQ + corpus refresh demo
- [ ] `ChatMessage` / `ChatBubble` — user vs assistant, with streaming support
- [ ] `RefusalNotice` — renders advice-refusal (+ AMFI link) and corpus-miss states distinctly (exact strings)
- [ ] `PendingActionCard` — tool name, payload preview, Approve/Reject buttons, `StatusBadge`
- [ ] `StatusBadge` — pending / approved / rejected color states
- [ ] `PulseCard` — Top Themes / Quotes / Key Observation / 3 Action Ideas, word-count indicator
- [ ] `FeeExplainerCard` — 6 bullets, 2 source links, `Last checked:` stamp
- [ ] `BookingCodeBadge` — displays `KV-XNNN`, copy-to-clipboard
- [ ] `MicButton` — voice capture control with idle / listening / processing / error states

### 6.3 Per-pillar screens (with states)

**FAQ chat — `/faq` (M1)**
- [ ] Chat layout: scrollable history + sticky input (Textarea + send)
- [ ] Streamed answer rendering with `CitationCard` (enforce exactly one)
- [ ] `RefusalNotice` wired for advice + corpus-miss paths
- [ ] "Draft follow-up email" action → enqueues `email_draft_generate` → toast linking to `/approvals`
- [ ] States: empty (suggested questions), loading (typing skeleton), error (retry)

**Approval Centre — `/approvals` (M1)**
- [ ] List of `approval_queue` rows as `PendingActionCard`s, newest first
- [ ] Filter tabs by status (Pending / Approved / Rejected)
- [ ] Approve → executes the MCP tool, writes side-effect table, updates status + `result`; Reject → no side effect
- [ ] Payload preview per tool type (email subject/body, calendar slot, note text)
- [ ] States: empty ("no pending actions"), loading, error; optimistic update + toast

**Reviews Intelligence — `/reviews` (M2)**
- [ ] `PulseCard` for the latest pulse + history list
- [ ] `FeeExplainerCard` for the generated explainer
- [ ] Visible **"Refresh corpus"** action (inserts explainer as `doc_type='fee_explainer'`) with confirmation toast
- [ ] **Re-query demo** panel: ask the FAQ a fee question → show the explainer now appears as a citation (proves flow A)
- [ ] States: empty (no reviews ingested), generating (skeleton), error

**Voice Scheduler — `/voice` (M3)**
- [ ] Greeting banner interpolating latest `pulses.top_theme` (visible + spoken)
- [ ] `MicButton` STT flow → booking → `BookingCodeBadge`; SpeechSynthesis reads code aloud
- [ ] **Typed fallback** input so the flow works without a working mic (demo safety)
- [ ] Volunteered-PII → on-screen + spoken deflection to secure-link message; nothing stored
- [ ] Transcript panel; booking code visible in the queued `notes_doc_append` action (link to `/approvals`)
- [ ] States: mic unsupported/denied (fallback prompt), listening, processing, error

**Dashboard — `/` (M4)**
- [ ] Cross-pillar summary cards: corpus size, latest pulse theme, pending approvals count, latest bookings
- [ ] `eval_runs` history table (suite, passed, score, time)
- [ ] Quick links into each pillar
- [ ] States: empty (nothing ingested yet), loading, error

### 6.4 Cross-cutting frontend concerns
- [ ] Accessibility — keyboard nav, focus rings, aria labels (shadcn/Radix gives most for free)
- [ ] Responsive — sidebar collapses to a drawer on mobile
- [ ] All async surfaces have explicit loading/error/empty states (no bare spinners on slow LLM/RAG calls)
- [ ] Server Components by default; Client Components only where interactivity needs it (chat, mic, approve buttons)
- [ ] Respect Next 16 / React 19 semantics (async `cookies()`/`headers()`, caching defaults)
- [ ] No PII rendered or logged anywhere in the UI

---

## 7. Cross-cutting / risk watch-list
- **Source verification** — every manifest URL is `last_checked: null`; several HDFC PDF links look templated and may 404. Verify before embedding.
- **Evals early, not late** — build the harness alongside M1; prompts imported from `lib/llm/` named exports (no drift).
- **Stack drift** — Next 16 / React 19: async `cookies()`/`headers()`, new caching defaults.
- **Voice fragility** — Web Speech quality varies; always keep a typed path.
- **PII discipline** — scrub at ingest, forbid in prompts, deflect in voice, scan in evals.
- **Secret hygiene** — rotate the Supabase secret key after the capstone (it was shared in chat).

---

## 8. Eval matrix (what proves each rule)
| `npm run` | Proves |
|---|---|
| `eval:rag` | faithfulness ≥0.8, relevance ≥0.8, citation accuracy (5 Qs) |
| `eval:adversarial` | 5/5 correct refusals (advice / PII / out-of-scope) |
| `eval:structure` | pulse counts, fee bullets/links/stamp, greeting theme, code in notes, market context in email |
| `eval:all` | runs all three, writes `eval_runs` |

---

## 9. Immediate next step
Land **M0 schema**. Blocked on one choice:
- **A)** provide `SUPABASE_DB_URL` → I write + apply `0001_init.sql` directly, or
- **B)** I write the SQL → you paste it into the Supabase SQL Editor.

Then: `lib/db` clients + typed env loader + eval dataset drafts → `npm run build` → commit M0.
