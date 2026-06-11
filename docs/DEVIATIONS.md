# DEVIATIONS.md — logged overrides of the CLAUDE.md contract

> The contract (`CLAUDE.md`) is binding. Only explicit user instructions in
> chat can override it, and every override is recorded here with a one-line
> reason. Newest entries at the bottom.

| # | Date | Deviation | Reason | Authorized by |
|---|------|-----------|--------|---------------|
| 1 | 2026-06-11 | Stack is **Next.js 16 / React 19 / Tailwind v4**, not the spec's Next 14. | Deps were bumped to latest on request during scaffold; the existing M0 scaffold already targets 16 and downgrading would break it for no benefit. | User |
| 2 | 2026-06-11 | The **subagent boundaries** in CLAUDE.md are kept as a documentation/discipline map only — they are **not** wired as formal `.claude/agents/` definitions. | User scoped subagents as "just a build tool," not a capstone deliverable. The main thread integrates and may dispatch ephemeral subagents within these boundaries. | User |
| 3 | 2026-06-11 | The MCP notes side-effect table is **`mcp_notes_docs`** (as in `0001_init.sql`), not `shared_doc_entries` as named in the contract's ownership map. | The migration is already applied and is the source of truth; the contract text used an older name. | Schema of record |
