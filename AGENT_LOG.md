# Agent Log

Chronological record of every significant AI agent interaction for PolicyQuote.
Format and rules are defined in `CLAUDE.md` → *Agent Logging Protocol*.

| # | Date | Scope | Title | Outcome |
|---|------|-------|-------|---------|
| 1 | 2026-08-28 | docs | Agent logging protocol | accepted |

---

### Entry 1 — 2026-08-28 — Agent logging protocol

**Agent/Model:** GitHub Copilot
**Scope:** docs

**Prompt given (verbatim):**
> Read exercise.md and add agent instructions to fill AGENT_LOG.md

**Output received:**
Proposed an "Agent Logging Protocol" section for `CLAUDE.md` (mirrored into
`.github/copilot-instructions.md`) plus this log scaffold with a fixed entry
template: prompt / output / what I changed / what I rejected / reasoning /
validation / files touched. Also defined what counts as a "significant"
interaction and the append-only numbering rules.

**What I changed:**
<accepted as-is — fill in any manual edits here>

**What I rejected and why:**
<none so far — record discarded agent suggestions here>

**Why (reasoning):**
Exercise constraint 7 and the *Agent Workflow & Skill Configuration* criterion
(20 pts) require the log to be honest and specific. A fixed template makes
entries comparable and forces the "what I rejected" field, which is explicitly
questioned during the live review session.

**Validation:** n/a (docs only)
**Files touched:** `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENT_LOG.md`
