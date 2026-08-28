<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

## Agent Logging Protocol (MANDATORY)

Every significant agent interaction MUST be appended to `AGENT_LOG.md` as part of
the same change — never as a separate cleanup pass.

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
