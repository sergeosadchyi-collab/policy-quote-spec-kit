# AGENTS.md — PolicyQuote

Canonical instructions for **any** AI coding agent working in this repository,
however it is launched — IDE chat, an external terminal CLI (`claude`, `copilot`,
`codex`, `cursor-agent`, `gemini`), or CI.

`CLAUDE.md` and `.github/copilot-instructions.md` are thin pointers to this file;
this is the single source of truth. Project governance lives in
`.specify/memory/constitution.md` and wins on conflict.

## Project non-negotiables (summary)

- **KB-driven scoring** — no hardcoded scoring values, band boundaries, or
  per-factor `if`/`switch` chains in application code. Rules live in the KB file.
- **Angular Signals only** for local UI state; no `BehaviorSubject`/`Subject`.
  Standalone components, no NgModules.
- **Lambda contract** — backend exports `handler(event, context)`; HTTP wiring is a
  thin adapter over it. Zod validates all input.
- **No `any`** — use `unknown` plus narrowing at trust boundaries; the KB schema is
  typed and validated at load time.
- **Deterministic backend** — no LLM or network calls; the KB is a local file.
- **No external UI component libraries** — hand-authored CSS only.

## Agent Logging Protocol (MANDATORY)

Every significant agent interaction MUST be appended to `AGENT_LOG.md` as part of
the same change — never as a separate cleanup pass. This applies to CLI sessions and
skill / slash-command runs (`/speckit-implement`, `/speckit-plan`, ...) exactly as it
applies to IDE chat.

**Significant** = anything that creates or changes source, KB schema, tests, config,
architecture, or dependencies. Not significant: read-only questions, file lookups,
formatting-only edits.

### Procedure

1. Before editing code, note the verbatim prompt you were given.
2. Make the change.
3. Append a new entry at the BOTTOM of `AGENT_LOG.md` (chronological, never reorder).
4. Increment the entry number; never renumber or rewrite past entries. Corrections
   go in a new entry that references the old one.
5. Add a row to the summary table at the top of `AGENT_LOG.md`.

For a multi-step workflow (e.g. a whole `/speckit-implement` run), write one entry
per logical change and quote the originating command or prompt verbatim.

### Entry template — use exactly this structure

```markdown
### Entry <N> — <YYYY-MM-DD HH:MM> — <short title>

**Agent/Model:** <e.g. GitHub Copilot / Claude Sonnet 4.5>
**Scope:** <frontend | backend | kb | tests | infra | docs>

**Prompt given (verbatim):**
> <the exact prompt, unedited>

**Output received:**
<what the agent produced — files created/modified with paths, key APIs/types
introduced, approach chosen. Summarise; don't paste whole files.>

**What I changed:**
<concrete human edits on top of agent output, or "accepted as-is">

**What I rejected and why:**
<agent suggestions discarded + reasoning. Write "none" only if truly none.>

**Why (reasoning):**
<why this approach fits the constraints: KB-driven scoring, Signals-only state,
no `any`, no UI libraries, deterministic backend>

**Validation:** <tests run, commands executed, manual checks, result>
**Files touched:** `path/one.ts`, `path/two.json`
```

### Rules

- Be honest and specific. Record failed attempts, hallucinated APIs, and rollbacks —
  these earn points; hiding them loses them.
- Quote prompts verbatim; do not retro-polish them into better prompts.
- Never write hardcoded scoring values into application code. If an agent proposes it,
  reject it and log the rejection.
- One entry per logical change, not per tool call.
- Do not end a session with code changes present but `AGENT_LOG.md` untouched.

### Self-check before ending a turn

If you modified anything outside `AGENT_LOG.md`, `AGENTS.md`, `CLAUDE.md`,
`README.md`, `SOLUTION.md`, `docs/`, `.specify/` or `.github/`, confirm you appended
an `AGENT_LOG.md` entry and added its summary-table row. If not, do it now.

