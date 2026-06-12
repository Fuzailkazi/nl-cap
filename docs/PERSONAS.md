# Personas: Mutual Fund Advisor Intelligence Suite

**Number of personas:** 3
**Primary persona:** Priya — Support & Compliance Operations Lead
**Date:** 2026-06-11

The product has two sides: internal AMC operators who run the Approval Centre + read the Pulse, and the retail investors the assistant serves. The signature features — human-approval gate, verbatim refusals, no-PII enforcement, runnable evals, Review Intelligence — are *operator* features. So the primary persona is internal, not the end investor.

---

### Persona 1: Priya — Support & Compliance Operations Lead (PRIMARY)

**One-line summary:** Owns investor-support quality and regulatory risk at the AMC; needs to scale support with AI without ever letting it give advice, leak PII, or auto-send something she can't defend to SEBI.

**Goals**
- Scale investor support (more questions answered, calls booked) **without** adding compliance/regulatory risk.
- Have an auditable trail proving the assistant never gave advice, never fabricated, never exposed PII.
- See what investors are actually struggling with each week and act on it.

**Pain Points**
- A normal chatbot is a compliance landmine — one hallucinated "you should buy X" or a leaked PAN is a reportable incident.
- No way to *prove* an AI system stayed inside the rules; "trust us" doesn't pass an audit.
- Outbound actions (emails, bookings) done by automation are unreviewable and irreversible.

**Behavior Patterns**
- **Frequency:** Daily — reviews the Approval Centre queue, reads the Weekly Pulse Monday morning.
- **Technical level:** Intermediate — comfortable with dashboards and process, not code; thinks in policies and exceptions.
- **Decision process:** Risk-first committee buyer; needs sign-off from legal/compliance; adopts only with guardrails she can demonstrate.
- **Current solution:** Human-only support (slow, expensive) or a generic chatbot legal won't approve.

**Key Quote**
> "I'll deploy AI the day I can prove, on demand, that it never gave advice and nothing went out without a human approving it."

**Product Implications**
- Build FOR her: the **Approval Centre** (mandatory human gate), **verbatim refusals**, **no-PII enforcement**, and **runnable evals** as her audit evidence — these are the product, not extras.
- Surface the **Weekly Pulse** and an action/audit log as first-class.
- Avoid: any "auto-send" shortcut or any feature that blurs facts vs. advice.

---

### Persona 2: Arjun — Frontline Support Agent (SECONDARY)

**One-line summary:** Handles the investor question/ticket queue all day; wants fast, citable, copy-paste-safe answers and easy follow-ups — without having to memorise scheme facts or fear saying the wrong thing.

**Goals**
- Resolve more tickets per hour with accurate, source-backed answers.
- Draft follow-up emails quickly, but with a safety net before anything sends.

**Pain Points**
- Digging through factsheets/KIMs for one expense-ratio number wastes minutes per ticket.
- Worries about accidentally giving advice or quoting a stale figure.

**Behavior Patterns**
- **Frequency:** Constant during shifts.
- **Technical level:** Intermediate; lives in support tools.
- **Decision process:** Adopts what his lead approves; values speed + one-click actions.
- **Current solution:** Manual doc lookup + copy-paste; ad-hoc email writing.

**Key Quote**
> "Just give me the answer with the source, and let me draft the email — but don't let me send something dumb."

**Product Implications**
- Build FOR him: the **FAQ bot's single-citation answers** and **"draft email through the gate"**; the Pulse to know what's trending.
- UX: speed, copy-friendly answers, clear "queued for approval" feedback.

---

### Persona 3: Neha — DIY Retail Investor (SECONDARY / served end-user)

**One-line summary:** App-native, direct-plan investor who wants quick factual answers about a fund and an easy way to book an advisor call — and who distrusts anything that feels like a sales pitch.

**Goals**
- Get a straight factual answer (expense ratio, category, exit load) fast, on her phone.
- Book a call on her terms, without handing over personal details into a chat box.

**Pain Points**
- Most "help" channels upsell or push products instead of answering.
- Hates repeating PII or being funneled to a salesperson.

**Behavior Patterns**
- **Frequency:** Occasional / bursty (around a decision).
- **Technical level:** Intermediate; mobile-first, self-directed.
- **Decision process:** Impulse/solo; abandons instantly if it feels salesy or slow.
- **Current solution:** Google, Reddit, aggregator apps (Kuvera/Groww) — trustworthy but generic.

**Key Quote**
> "Just tell me the fact and cite it — don't sell me, and don't ask for my PAN in a chat."

**Product Implications**
- Build FOR her: trustworthy **cited answers**, **advice refusal** as a *feature* (no pressure), **voice/typed booking** with **PII deflection**.
- UX: mobile-friendly, fast, neutral tone.

---

### Persona Priorities

| Persona | Priority | Why | Build For | Don't Build For |
|---------|----------|-----|-----------|-----------------|
| Priya (Ops/Compliance Lead) | **Primary** | Economic buyer + champion; the suite's signature features (approval gate, evals, refusals, Pulse) exist for her | Approval Centre, verbatim guardrails, evals-as-audit, Weekly Pulse | Anything that auto-sends or gives advice |
| Arjun (Support Agent) | Secondary | Daily operational user; drives throughput | FAQ single-citation answers, gated email drafts | Free-form generation without a gate |
| Neha (DIY Investor) | Secondary | The served end-user; product is shaped to *protect* her | Cited answers, no-pressure refusals, PII-safe booking | Personalized recommendations/portfolio advice |

### Anti-Persona: "Rohan the Tip-Seeker"
**Who they are:** An investor (or a commission-driven distributor) who wants the bot to tell them *which fund to buy*, predict returns, optimise their portfolio, or generate sales/upsell prompts.
**Why excluded:** Serving them means giving investment advice and performance claims — the exact line the product refuses to cross by design. Bending to them would break the compliance guarantee that makes Priya (the primary) able to deploy it at all. Refusing Rohan isn't a gap; it's the point.
