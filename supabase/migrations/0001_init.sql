-- =============================================================================
-- 0001_init.sql — M0 schema for the Mutual Fund Advisor Intelligence Suite
-- Two spines: (1) the single `corpus` RAG table, (2) the `approval_queue` gate.
-- Plus supporting tables for reviews, pulses, bookings, MCP side-effects, evals.
-- Embedding dim = 1536 (OpenAI text-embedding-3-small). Keep in sync with EMBEDDING_DIM.
-- =============================================================================

create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- SPINE 1 — RAG corpus. Every doc (and every fee_explainer) is a row here.
-- Fee Explainers are inserted with doc_type='fee_explainer' — that IS the refresh.
-- -----------------------------------------------------------------------------
create table if not exists corpus (
  id           bigint generated always as identity primary key,
  doc_type     text   not null check (doc_type in
                 ('factsheet','kim','sid','amc_page','amfi','sebi','kuvera','fee_explainer')),
  scheme       text,                       -- null for non-scheme-specific docs
  title        text   not null,
  url          text,                       -- official source link (one citation)
  content      text   not null,            -- the chunk text
  embedding    vector(1536),               -- OpenAI text-embedding-3-small
  last_checked date,                       -- stamped only after source is verified
  created_at   timestamptz not null default now()
);

-- Approximate-NN index for cosine similarity search.
create index if not exists corpus_embedding_idx
  on corpus using hnsw (embedding vector_cosine_ops);
create index if not exists corpus_doc_type_idx on corpus (doc_type);
create index if not exists corpus_scheme_idx   on corpus (scheme);

-- -----------------------------------------------------------------------------
-- Pillar 2 source data — ingested reviews (NO PII ever stored here).
-- -----------------------------------------------------------------------------
create table if not exists reviews (
  review_id    text primary key,           -- stable id e.g. R001
  review_date  date not null,
  scheme       text not null,
  channel      text not null check (channel in
                 ('app_store','play_store','kuvera','support_ticket','survey')),
  rating       int  not null check (rating between 1 and 5),
  review_title text,
  review_text  text not null,
  language     text not null default 'en',
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Pillar 2 output — Weekly Pulse. Voice greeting reads the latest top_theme.
-- -----------------------------------------------------------------------------
create table if not exists pulses (
  id          bigint generated always as identity primary key,
  top_theme   text not null,               -- interpolated into the voice greeting
  body        text not null,               -- full pulse (<=250 words)
  word_count  int,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Pillar 3 — bookings. Code must match ^KV-[A-Z][0-9]{3}$.
-- -----------------------------------------------------------------------------
create table if not exists bookings (
  id          bigint generated always as identity primary key,
  code        text not null unique check (code ~ '^KV-[A-Z][0-9]{3}$'),
  slot        text not null,               -- mock calendar slot label
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- SPINE 2 — the approval gate. Every MCP tool call lands here as 'pending'.
-- Side-effect tables are written ONLY on the approve transition.
-- -----------------------------------------------------------------------------
create table if not exists approval_queue (
  id          bigint generated always as identity primary key,
  tool        text not null check (tool in
                 ('notes_doc_append','calendar_hold_create','email_draft_generate')),
  payload     jsonb not null,              -- the proposed action's inputs
  status      text  not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  result      jsonb,                       -- execution result or error after decision
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists approval_queue_status_idx on approval_queue (status);

-- -----------------------------------------------------------------------------
-- MCP side-effect tables — written only after approval. Each links its action.
-- -----------------------------------------------------------------------------
create table if not exists mcp_notes_docs (
  id          bigint generated always as identity primary key,
  action_id   bigint not null references approval_queue(id),
  content     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists calendar_holds (
  id          bigint generated always as identity primary key,
  action_id   bigint not null references approval_queue(id),
  slot        text not null,
  title       text,
  created_at  timestamptz not null default now()
);

create table if not exists email_drafts (
  id          bigint generated always as identity primary key,
  action_id   bigint not null references approval_queue(id),
  subject     text,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Evals — history of eval suite runs.
-- -----------------------------------------------------------------------------
create table if not exists eval_runs (
  id          bigint generated always as identity primary key,
  suite       text not null check (suite in ('rag','adversarial','structure','all')),
  passed      boolean not null,
  score       numeric,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
