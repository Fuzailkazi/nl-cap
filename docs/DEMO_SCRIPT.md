# 5-Minute Demo Video — Script & Flow

## ⚡ LIVE RUN CARD — glance here while recording

> **Before record:** `npm run dev` → Chrome at localhost:3000 · mic allowed · `npm run reviews` + `npm run eval:all` ran once · windows: browser + terminal + `data/reviews.csv`.

| ⏱ | Where | Do | Copy-paste input | One-liner to say |
|----|-------|-----|------------------|------------------|
| 0:00 | `/` dashboard | show it | — | "Control center — 3 pillars, 1 corpus, 1 approval gate." |
| 0:35 | editor → terminal | scroll CSV, then run | `npm run reviews` | "40 raw reviews → an LLM distills a Weekly Pulse." |
| | `/reviews` | refresh, point at top theme | — | "≤250 words, real quotes, 3 actions. Remember this top theme." |
| 1:40 | `/voice` | let greeting play | — | "Greeting reads the Pulse's top theme live — new Pulse, new greeting." |
| | `/voice` | 🎤 Speak / type, pick a slot | `I'd like to book a call` | "Books it, makes a KV- code, reads it aloud." |
| | `/voice` | type PII test | `My PAN is ABCDE1234F` | "Volunteered PII → refused, redacted. No PII ever." |
| | `/approvals` | click **Approve** | — | "Nothing auto-sends. A human approves here." |
| 2:55 | `/faq` | ask (it refuses) | `How does a mutual fund's expense ratio affect my returns?` | "No verified source → it won't fabricate." |
| | `/reviews` | click **Generate & refresh corpus** | — | "Smart-Sync: Fee Explainer inserted into the same corpus, no redeploy." |
| | `/faq` | ask (now answers) | `What does the expense ratio mean, and is the HDFC Flexi Cap Fund an equity fund?` | "3 sentences, 1 citation. Corpus learned, bot got smarter." |
| | `/faq` | ask (it declines) | `Which HDFC fund should I buy for the best returns?` | "Never gives advice → points to AMFI. Enforced by evals." |
| 4:25 | terminal | run | `npm run eval:all` | "20 checks, all green. Facts-only, human-in-loop, provable. Thanks." |

> **If running long:** cut the PII line (1:40) and the advice line (2:55). The 3 must-haves are Pulse · Voice-with-context · Smart-Sync.
> **If a step 429s:** stop, wait for daily reset / add billing, re-shoot that beat. Dashboard + existing Pulse need no LLM calls.

---

**Goal:** in ~5 minutes, show the three required moments —
1. a **Review CSV processed into a Weekly Pulse**,
2. a **Voice call booked that uses that Pulse's context**, and
3. the **"Smart-Sync" FAQ answering a complex fee + fact question**
— inside the story of *why* this product exists.

---

## 0. One-paragraph context (say this in your own words)
> "This is a **compliance-first, voice-first support assistant for a mutual fund company.** The hard problem in finance isn't building a chatbot — it's building one a *compliance officer will approve*: it must answer facts with citations, **never give investment advice**, never leak PII, and **never act without a human approving it**. I built three pillars over one RAG corpus and one human-approval gate, and the rules are *proven by runnable evals*."

Keep this thread running through the whole video: **facts only, human-in-the-loop, provable.**

---

## 1. Pre-recording checklist (do this BEFORE you hit record)

- [ ] **Start the app:** `npm run dev` → open **http://localhost:3000** in **Chrome** (mic only works in Chrome/Edge).
- [ ] **Grant mic permission** once (visit `/voice`, click Speak, allow) so it doesn't prompt on camera. If mic is flaky, you'll use the **typed fallback** — works identically.
- [ ] **Gemini quota:** the free tier meters **generation per day, per model** (`gemini-2.5-flash` is only **20/day**; `gemini-2.5-flash-lite`, the configured default, is far higher) and **embeddings per minute** (~100 inputs/min). A full demo is ~8–10 generation calls. If you've been running evals today, **check remaining quota, switch `GEMINI_GEN_MODEL` to a model with budget left, or add billing** first, or the live LLM steps will 429. Do **one rehearsal**, then record fresh.
- [ ] **Seed a clean state (optional but recommended):**
  - `npm run reviews` once beforehand so a Pulse already exists (you'll regenerate live for the camera).
  - `npm run eval:all` beforehand so a fresh **green run shows on the dashboard** for the outro.
- [ ] **Windows to have open:** browser (full screen) + a terminal + `data/reviews.csv` in your editor.
- [ ] **Recorder:** QuickTime / Loom / OBS at 1080p, capture system audio + mic. Hide bookmarks bar / notifications.
- [ ] Hard-refresh each page once so there's no stale state.

---

## 2. Shot-by-shot script (target 5:00)

### ▶ 0:00–0:35 — Intro + Dashboard
**On screen:** the Dashboard (`/`).
**Say:**
> "This is the Mutual Fund Advisor Intelligence Suite — a facts-only support assistant for HDFC Mutual Fund. Here's the control center: how many documents are in the RAG corpus, pending human approvals, bookings, and this week's top investor theme. Three pillars sit on one corpus and one approval gate. Let me show the three flows that tie it together."

---

### ▶ 0:35–1:40 — Beat 1: Review CSV → Weekly Pulse
**On screen:** show `data/reviews.csv` in the editor (scroll the 40 rows), then the terminal.
**Say:**
> "We start with raw customer feedback — 40 reviews across the four schemes, app-store, support tickets, surveys. No human reads all of these. So Review Intelligence does."

**Do:** run in terminal:
```
npm run reviews
```
**Say (while it runs):**
> "This ingests the CSV — scrubbing any PII — then an LLM distills it into a Weekly Pulse."

**Do:** switch to **`/reviews`**, the Pulse card is there (refresh if needed).
**Say:**
> "Here's the Pulse — under 250 words, with Top Themes, real user quotes, a key observation, and exactly three action ideas the support team can act on. Notice the top theme" — *point* — "*'Information clarity and transparency.'* Remember that — it's about to drive the voice agent."

*(Tip: you can instead click **Regenerate** on `/reviews` for a live on-camera generation.)*

---

### ▶ 1:40–2:55 — Beat 2: Voice call booked, using the Pulse context
**On screen:** go to **`/voice`**. The greeting is spoken aloud on load.
**Say:**
> "Now the Voice Scheduler. Listen to the greeting —" *(let the TTS play)* — "it says investors are most focused on *information clarity and transparency.* That phrase came straight from the Pulse we just generated — the greeting reads the latest Pulse's top theme live. New Pulse, new greeting, no redeploy."

**Do:** click **🎤 Speak** and say *"I'd like to book a call"* (or type it in the fallback box).
**Do:** click a slot (e.g. *Tomorrow, 10:00 AM*).
**Say:**
> "It books the call, generates a booking code — *KV-…* — and reads it back aloud."

**Do:** (compliance beat) type into the box: `My PAN is ABCDE1234F`.
**Say:**
> "And if a caller volunteers personal data, it refuses to store it and deflects to a secure link — the transcript even redacts it. No PII, ever."

**Do:** click the **'see it in the Approval Centre'** link → `/approvals`.
**Say:**
> "The booking didn't just happen — it queued an action. Nothing auto-sends. A human approves it here." *(Click **Approve** on the notes action.)*

---

### ▶ 2:55–4:25 — Beat 3: "Smart-Sync" FAQ — complex fee + fact question
**Frame it first.** On screen: **`/faq`**.
**Say:**
> "Last, the FAQ bot — and 'Smart-Sync,' which is how Review Intelligence makes the FAQ smarter. Watch. First I'll ask a fee question *before* syncing."

**Do:** ask: `How does a mutual fund's expense ratio affect my returns?`
**Say:**
> "It says it has no verified source — it refuses to make something up. That's the no-fabrication rule."

**Do:** go to **`/reviews`** → click **"Generate & refresh corpus."**
**Say:**
> "Now Smart-Sync: Review Intelligence generates a Fee Explainer — six neutral bullets, two official sources, a 'last checked' date — and inserts it straight into the *same* RAG corpus as a citable document. No redeploy, no re-index by hand."

**Do:** back to **`/faq`**, ask the **complex fee + fact** question:
```
What does the expense ratio mean, and is the HDFC Flexi Cap Fund an equity fund?
```
**Say:**
> "Same engine, now answered — in three sentences, with exactly one official citation. It pulled the *fee concept* from the freshly-synced explainer and the *scheme fact* from HDFC's page. That's the Smart-Sync: the corpus learned, and the bot got smarter instantly."

**Do:** (compliance capstone) ask: `Which HDFC fund should I buy for the best returns?`
**Say:**
> "And the one thing it will never do — give advice. It declines and points to AMFI. That refusal is enforced in code and matched verbatim by our evals."

---

### ▶ 4:25–5:00 — Outro: proof + close
**On screen:** terminal — run `npm run eval:all` (or show the dashboard's eval-runs table).
**Say:**
> "None of this is 'trust me.' Every rule — citation accuracy, faithfulness, the advice and PII refusals, the output formats — is a runnable eval. Here's the suite: 20 checks, all green. Plus 35 verified official sources and a human approval gate on every action. That's the whole point: an AI fund-support assistant a compliance team can actually deploy. Thanks for watching."

---

## 3. Exact inputs (copy-paste during the demo)

| Beat | Action | Exact input |
|------|--------|-------------|
| 1 | Terminal | `npm run reviews` |
| 2 | Voice / typed | `I'd like to book a call` |
| 2 | PII test (typed) | `My PAN is ABCDE1234F` |
| 3 | FAQ before sync | `How does a mutual fund's expense ratio affect my returns?` |
| 3 | FAQ after sync (fee + fact) | `What does the expense ratio mean, and is the HDFC Flexi Cap Fund an equity fund?` |
| 3 | Advice refusal | `Which HDFC fund should I buy for the best returns?` |
| Outro | Terminal | `npm run eval:all` |

---

## 4. Tips & gotchas
- **One citation, ≤3 sentences:** the fee+fact answer cites ONE source — that's the contract. If you want it to clearly show the synced explainer, you can instead ask the pure fee question after sync (`What does an expense ratio mean?`) — it'll cite the fee explainer's AMFI source.
- **Quota:** if a live step 429s mid-record, stop, wait for the daily reset (or add billing), and re-shoot that beat. The dashboard's eval table and the existing Pulse don't need LLM calls, so they always render.
- **Mic flaky on camera?** Use the typed fallback for Beat 2 — the booking + code + PII-deflect all work identically.
- **Keep the thread:** every beat, tie back to *facts-only / human-in-the-loop / provable.* That's the story reviewers remember.
- **Length:** if you're over 5:00, cut the PII sub-beat in Beat 2 and the advice-refusal in Beat 3 — the three required moments (Pulse, Voice-with-context, Smart-Sync) are the must-haves.
