# Agent Log

Chronological record of every significant AI agent interaction for PolicyQuote.
Format and rules are defined in `CLAUDE.md` → *Agent Logging Protocol*.

| # | Date | Scope | Title | Outcome |
|---|------|-------|-------|---------|
| 1 | 2026-08-28 | docs | Agent logging protocol | accepted |
| 2 | 2026-08-28 | docs | AGENTS.md universal entrypoint | accepted |

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

---

### Entry 2 — 2026-08-28 — AGENTS.md universal entrypoint

**Agent/Model:** GitHub Copilot
**Scope:** docs

**Prompt given (verbatim):**
> When I run CLI commands from another Terminal, there are no entries in AGENT_LOG.md.
> How can it be fixed?

followed by:

> Do Fix 1 — universal entrypoint: create AGENTS.md

**Output received:**
Diagnosis: instruction-file discovery is tool-specific.
`.github/copilot-instructions.md` is loaded by Copilot in the IDE only and
`CLAUDE.md` only by Claude Code, so a `copilot`/`codex`/`cursor-agent`/`gemini`
session started in an external terminal loaded neither — the protocol was never in
context. Secondary causes: `.claude/skills/speckit-*/SKILL.md` outlines dominate and
never mention logging, and soft instructions get dropped in long autonomous runs.

Fix applied: created root `AGENTS.md` (the file convention every major CLI agent
reads) holding the full protocol plus a non-negotiables summary and an
end-of-turn self-check. `CLAUDE.md` and `.github/copilot-instructions.md` were
reduced to pointers at `AGENTS.md`, keeping the `<!-- SPECKIT -->` blocks intact.

Agent also proposed three further fixes, not applied in this entry: a `Stop` hook
script `.specify/scripts/bash/check-agent-log.sh` registered in
`.claude/settings.json` (exit code 2 blocks turn end when code changed but
`AGENT_LOG.md` did not), a mirrored git `pre-commit` hook, and a logging step
appended to the speckit skill outlines.

**What I changed:**
<accepted as-is — fill in any manual edits here>

**What I rejected and why:**
Rejected duplicating the protocol text across three files (the initial Entry 1
approach): three copies drift, and the copy the CLI actually reads would silently
fall behind. Single source of truth + pointers instead.
Deferred (not rejected) the Stop hook and pre-commit hook — enforcement is the
durable fix, but scoped to a separate change.

**Why (reasoning):**
Instruction files are advisory and discovery differs per tool, so the first
correction is making the protocol *reachable* from every launch surface. `AGENTS.md`
is the widest-supported convention; pointers preserve IDE behaviour without
maintaining parallel copies. Constitution Principle VI (Agent Interaction
Transparency) remains the governing rule; `AGENTS.md` is subordinate to it.

**Validation:** Verified no `.claude/settings.json` or pre-existing `AGENTS.md`
existed; confirmed `<!-- SPECKIT START/END -->` markers survive in both pointer
files. Docs-only change, no tests to run. Not yet validated against a real external
CLI session — next step is to start one and ask "what is the Agent Logging
Protocol?" to confirm the file is discovered.
**Files touched:** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENT_LOG.md`


