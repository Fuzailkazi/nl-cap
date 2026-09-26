# 🛡️ Mutual Fund Advisor Intelligence Suite
### Voice-First, Compliance-First Support Platform for Mutual Fund Investors

[![Live Demo](https://img.shields.io/badge/Live_Demo-nl--cap.vercel.app-0C6B58?style=for-the-badge&logo=vercel&logoColor=white)](https://nl-cap.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase pgvector](https://img.shields.io/badge/Supabase-pgvector_1536d-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash_Lite-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standardized_Tools-purple?style=flat-square)](https://modelcontextprotocol.io)
[![Evals](https://img.shields.io/badge/Compliance_Evals-100%25_Passing-brightgreen?style=flat-square)](evals/)

> **A production-grade, compliance-first AI system designed for strictly regulated financial domains.** 
> Built around **three interconnected pillars** sharing a single `pgvector` knowledge base and an **MCP-backed Human-in-the-Loop approval gate**.

---

## 📌 Executive Summary & Problem Space

In wealth management and financial services, building a chatbot is easy—building one that **a compliance officer and regulator will approve** is the true engineering challenge:
- Financial regulations (SEBI / AMFI) strictly penalize unlicensed investment advice or fabricated performance claims.
- Customer support agents are overwhelmed by repetitive fee/NAV inquiries while missing critical operational bottlenecks buried in app reviews.
- Outbound AI agents without human oversight create massive operational and reputational risk.

This platform solves these challenges through **deterministic compliance contracts**, **continuous knowledge synchronization**, and **provable automated evals**.

---

## 🏛️ The Three Pillars + Approval Gate

```
                              ┌────────────────────────────────────────┐
                              │   Unified Knowledge Corpus (pgvector)  │
                              └───────────────────▲────────────────────┘
                                                  │ (A) Smart-Sync Refresh
                 ┌────────────────────────────────┴────────────────────────┐
                 │                                                         │
       ┌─────────┴─────────┐                              ┌────────────────┴────────────────┐
       │     PILLAR 1      │                              │            PILLAR 2             │
       │   FAQ RAG Bot     │                              │       Review Intelligence       │
       │                   │                              │                                 │
       │ • ≤3 sentences    │                              │ • Distills Weekly Pulse         │
       │ • 1 exact source  │                              │ • Identifies top theme          │
       │ • Zero advice     │                              │ • Generates Fee Explainers      │
       └─────────▲─────────┘                              └────────────────┬────────────────┘
                 │                                                         │
                 │                                (B) Dynamic Theme Context│
                 │                                                         ▼
┌────────────────┴────────────────┐                       ┌─────────────────────────────────┐
│           MCP GATEWAY           │                       │            PILLAR 3             │
│      Human Approval Centre      │◄── (C) Queues MCP ────│         Voice Scheduler         │
│                                 │       Actions         │                                 │
│ • Enqueues pending actions      │                       │ • Browser STT / TTS             │
│ • Zero auto-execution           │                       │ • Context-aware voice greeting  │
│ • Human approve / reject        │                       │ • PII deflection & redaction    │
└─────────────────────────────────┘                       └─────────────────────────────────┘
```

### 1. Pillar 1: Grounded FAQ Bot (RAG)
* **Contract-Enforced Generation:** Answers are constrained to **≤3 sentences** and backed by **exactly one verified citation link** directly from official AMC/SEBI/AMFI sources.
* **Hard Advice Refusal:** When asked for fund recommendations, predictions, or "which fund is best", it refuses deterministically and routes users to unbiased investor education (`https://www.amfiindia.com/`).
* **Corpus Miss Deflection:** If information is missing or ungrounded, it refuses to hallucinate, stating it lacks a verified source and offering an advisor call.

### 2. Pillar 2: Review Intelligence & Smart-Sync
* **Weekly Pulse:** Ingests unorganized customer reviews across app stores and support tickets, distilling them into a concise Weekly Pulse (Top Themes, Verbatim Quotes, Key Observations, Exactly 3 Action Ideas).
* **Smart-Sync Corpus Refresh:** When a recurring friction point is detected (e.g., confusion over expense ratios), an analyst triggers a **Fee Explainer**. It is embedded directly into the live `corpus` table as `doc_type='fee_explainer'`—instantly upgrading the FAQ bot's knowledge base **with zero redeployment**.

### 3. Pillar 3: Voice Scheduler
* **Browser Voice Interface:** Hands-free voice booking built on the Web Speech API (STT & TTS) with zero external audio infrastructure costs.
* **Contextual Voice Greeting:** Automatically queries the latest Review Pulse to greet callers with the week's trending theme: *"Welcome... This week our investors are most focused on fee transparency..."*
* **Deterministic Booking Codes:** Generates formatted codes (`KV-[A-Z][0-9]{3}`) and spells them phonetically for clear audio delivery.
* **Zero-PII Volunteer Deflection:** If a caller volunteers sensitive details (PAN card, Aadhaar, account numbers), the model deflects immediately with an approved security script and redacts the log in real time.

### 4. Cross-Cutting: MCP Human Approval Centre
* Powered by the **Model Context Protocol (MCP)** exposing 3 standardized tools:
  1. `notes_doc_append` — Log advisor booking codes into the shared notes doc.
  2. `calendar_hold_create` — Reserve advisor calendar blocks.
  3. `email_draft_generate` — Draft follow-up emails with verified citations.
* **The Non-Negotiable Gate:** Every MCP action is enqueued with `status: pending`. **No side effects ever execute automatically.** A human advisor must review and click "Approve" in the Approval Centre.

---

## 🧪 Provable Compliance: Automated Eval Suites

Correctness and regulatory compliance are not left to chance—they are enforced by automated eval suites run against golden datasets:

| Suite | Focus | Key Checks | Status |
| :--- | :--- | :--- | :---: |
| **`eval:retrieval`** | Search Precision | Recall & single citation accuracy over golden dataset | ✅ PASS |
| **`eval:generation`** | Answer Quality | LLM-as-judge faithfulness & relevance (≥0.8 threshold) | ✅ PASS |
| **`eval:compliance`** | Regulatory Safety | Verbatim advice refusal, sentence clamping (≤3), 0 PII leak | ✅ PASS (100%) |
| **`eval:injection`** | Adversarial Defense | Prompt-injection resistance & jailbreak prevention | ✅ PASS |
| **`eval:structure`** | Format Invariants | Pulse length, Fee Explainer bullets, `KV-` code regex | ✅ PASS |

To run the full suite locally:
```bash
npm run eval:all
```

---

## 🛠️ Tech Stack & Architecture Decisions

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** (App Router, Turbopack) + React 19 | Serverless edge execution, streaming UI, sub-second builds |
| **Language & Styling** | **TypeScript** (Strict) + **Tailwind CSS v4** | Full type safety across contracts, zero runtime CSS overhead |
| **Database & Vectors** | **Supabase Postgres** (`pgvector` 1536-dim HNSW) | Single store for RAG corpus, operational tables, and audit logs |
| **Embeddings & LLM** | **Google Gemini** (`gemini-2.5-flash-lite` + `gemini-embedding-001`) | High throughput, sub-second latency, unified API key via OpenAI-compatible endpoint |
| **Tool Orchestration** | **Model Context Protocol (MCP)** TS SDK | Standardized tool abstraction with explicit human review gates |
| **Voice Layer** | **Web Speech API** (`SpeechRecognition` & `SpeechSynthesis`) | Native client-side audio processing; zero recurring per-minute voice API bills |

---

## 🚀 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/Fuzailkazi/nl-cap.git
cd nl-cap
npm install
```

### 2. Configure Environment Variables
Create `.env.local` using the template:
```bash
cp .env.example .env.local
```
Configure your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<your-project>.supabase.co:5432/postgres

GEMINI_API_KEY=your-gemini-api-key
GEMINI_GEN_MODEL=gemini-2.5-flash-lite
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=1536
```

### 3. Database Migration & Seed
Run migrations in Supabase SQL editor (`supabase/migrations/0001_init.sql` & `0002_eval_runs_suites.sql`), then seed:
```bash
npm run ingest   # Scrapes and embeds official scheme docs into pgvector
npm run reviews  # Ingests review dataset and generates initial Weekly Pulse
```

### 4. Run Locally
```bash
npm run dev      # Next.js Turbopack dev server on http://localhost:3000
```

---

## 📁 Repository Map

```
app/                    # Next.js 16 App Router pages & serverless API routes
├── api/                # /faq, /reviews, /voice, /approvals route handlers
├── faq/                # Grounded FAQ Bot interface
├── reviews/            # Review Intelligence, Weekly Pulse & Smart-Sync trigger
├── voice/              # Web Speech voice booking assistant
└── approvals/          # Human-in-the-loop Approval Centre
lib/                    # Core business logic & architecture contracts
├── contracts.ts        # Single source of truth (Zod schemas, verbatim refusal strings)
├── llm/                # Gemini client & prompt definitions (named exports for evals)
├── rag/                # Embedding, chunking, and pgvector cosine similarity retrieval
├── voice/              # Greeting builder, phonetic code speller, mock slots
└── mcp/                # MCP tool definitions and approval queue state machine
mcp/                    # Model Context Protocol standalone server
evals/                  # 5-suite evaluation harness & test fixtures
data/                   # Source manifest (official links) & reviews CSV
supabase/migrations/    # Postgres + pgvector database schemas
```

---

## 📄 Case Study & Demo
- **Live Deployment:** [nl-cap.vercel.app](https://nl-cap.vercel.app)
- **Product Case Study:** [docs/case-study.html](docs/case-study.html)
- **5-Minute Live Run Guide:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
