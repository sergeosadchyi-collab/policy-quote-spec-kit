# Agent Log

Chronological record of every significant AI agent interaction for PolicyQuote.
Format and rules are defined in `CLAUDE.md` → *Agent Logging Protocol*.

| # | Date | Scope | Title | Outcome |
|---|------|-------|-------|---------|
| 1 | 2026-08-28 | docs | Agent logging protocol | accepted |
| 2 | 2026-08-28 | docs | AGENTS.md universal entrypoint | accepted |
| 3 | 2026-08-28 | docs | Implementation plan & Phase 0/1 design artifacts | accepted with edits |

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



---

### Entry 3 — 2026-08-28 20:45 — Implementation plan & Phase 0/1 design artifacts

**Agent/Model:** GitHub Copilot CLI / Claude Opus 5 (mid-session switch from Claude Sonnet 5)
**Scope:** docs

**Prompt given (verbatim):**
> The user explicitly invoked the "/speckit-plan" skill. Follow its instructions now.

(invoked with empty user input; the session was started under Claude Sonnet 5,
which completed setup and context loading, then switched to Claude Opus 5 which
produced all artifacts)

**Output received:**
Ran the `before_plan` extension hook check — `speckit.git.commit` is optional and
the tree was clean, so it was reported and skipped rather than executed. Ran
`.specify/scripts/bash/setup-plan.sh --json`, which copied the plan template into
`specs/001-policy-quote-app/plan.md`.

Produced the full Phase 0 + Phase 1 artifact set:

- `research.md` — 12 numbered decisions (R1–R12), each with rationale and
  rejected alternatives: Node 22 / TS strict + `noUncheckedIndexedAccess`;
  Angular 20.3.x; `node:http` adapter; dev-server proxy instead of CORS; Zod for
  both request and KB; frozen operator/combinator lookup tables; bands as an
  ordered array; epsilon-corrected rounding; semver range version gate; KB-held
  summary templates; KB-derived test expectations; two-package layout.
- `data-model.md` — 11 sections covering `QuoteRequest`, `RiskKnowledgeBase`,
  `RiskBand`, `RiskFactor`, the recursive `Condition` union, `AppliedFactor`,
  `CoverageDetails`, `QuoteResult`, the derivation pipeline (with the two
  rounding points marked), the closed summary-placeholder set, and the frontend
  signal table.
- `contracts/policy-quote.openapi.yaml` — OpenAPI 3.1 for `POST /policy/quote`.
- `contracts/risk-kb.schema.json` — JSON Schema 2020-12 for the KB, with
  recursive `$defs` for conditions and a worked example.
- `contracts/lambda-handler.md` — handler signature, adapter direction, KB load
  sequence, failure taxonomy, cross-field validations, module boundary table.
- `contracts/frontend-components.md` — `RiskBandBadgeComponent`, API client,
  Signals state contract, applied-factor rendering rules, form contract.
- `quickstart.md` — 5-command startup, KB location, the "add a flood-zone
  factor" demo, KB-only change table, and deliberate failure modes.
- `plan.md` — Summary, Technical Context, Constitution Check (7 principles +
  technology constraints + workflow gates), post-Phase-1 re-evaluation, concrete
  source tree, empty Complexity Tracking.

Agent context pointers updated in `CLAUDE.md` and `.github/copilot-instructions.md`
between the `<!-- SPECKIT -->` markers.

**What I changed:**
Two corrections made during the run rather than accepted blindly:

1. The first draft pinned Angular 22.1.4 (latest). Checking
   `npm view @angular/core@22.1.4 engines` returned `node: ^22.22.3 || ^24.15.0`
   against a local Node of exactly 22.22.3 — the bottom edge of the range. Pinned
   Angular 20.3.x instead (`^20.19.0 || ^22.12.0 || >=24.0.0`), which has real
   headroom and protects SC-009's ≤5-command startup.
2. `quickstart.md` initially left "does `startsWith` ship in v1?" as an open
   planning question. That is not a decision a plan may defer: the spec's
   Assumptions say postcode is captured so flood-zone prefix factors can be added
   "without product changes". Resolved it in `plan.md` as ship-in-v1, then
   back-propagated the decision into `quickstart.md`, `data-model.md` §5a, and
   `contracts/risk-kb.schema.json`.

**What I rejected and why:**
- **Express for the backend.** Rejected because Principle III requires HTTP to be
  a thin adapter over `handler()`, "never the other way round" — and an Express
  app invites `app.post(...)` to become the real entry point with the Lambda
  handler demoted to a wrapper, inverting the required dependency direction.
- **The brief's `riskBands` object map.** Rejected in favour of an ordered array.
  The map makes "the highest band" undiscoverable without writing
  `bands['HIGH_RISK']` — a hardcoded band identifier, which Principle I
  prohibits outright.
- **A hand-written `interface RiskKnowledgeBase` alongside a separate runtime
  check.** Rejected as two sources of truth; types are derived with `z.infer<>`
  so the type *is* the validator's output and cannot drift.
- **Handlebars/Mustache for summary templates.** Rejected: its lenient default
  (unknown token → empty string) is precisely the behaviour FR-014b prohibits.
- **`Math.round(v * 100) / 100` for money.** Rejected: `1.005` is stored as
  `1.00499…` and rounds down, producing a visibly wrong premium.
- **npm workspaces / Nx.** Rejected as a root install layer working against the
  ≤5-command criterion at a scale where hoisting buys nothing.
- **The Dockerfile / `GET /health` bonus.** Excluded from the plan: it maps to no
  functional requirement in `spec.md`, and the spec is the authority. Recorded
  explicitly in `research.md` rather than silently dropped.

**Why (reasoning):**
Every decision was checked against the constitution rather than against general
best practice. The two that carry the most weight: the frozen
`LEAF_OPERATORS`/`GROUP_COMBINATORS` lookup records exist because Principle I
bans `switch (condition.operator)` explicitly and demands data-driven dispatch;
and positional band resolution exists because clamping to "the highest band" must
not name a band. `startsWith` is justified as a *capability* addition under
Development-Workflow gate 3, which is the distinction that keeps "add a factor =
KB-only diff" true rather than aspirational. Constitution Check passes all seven
principles with no violations, so Complexity Tracking is empty.

**Validation:** `setup-plan.sh` ran clean. `risk-kb.schema.json` re-parsed with
`JSON.parse` after the `startsWith` edit — valid. `policy-quote.openapi.yaml`
read back (281 lines). Angular/Zod/Jest versions and Angular's `engines` field
verified against the live npm registry, not assumed. `<!-- SPECKIT START/END -->`
markers confirmed intact in both pointer files. No code exists yet, so no tests
to run.
**Files touched:** `specs/001-policy-quote-app/plan.md`, `specs/001-policy-quote-app/research.md`, `specs/001-policy-quote-app/data-model.md`, `specs/001-policy-quote-app/quickstart.md`, `specs/001-policy-quote-app/contracts/policy-quote.openapi.yaml`, `specs/001-policy-quote-app/contracts/risk-kb.schema.json`, `specs/001-policy-quote-app/contracts/lambda-handler.md`, `specs/001-policy-quote-app/contracts/frontend-components.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENT_LOG.md`
