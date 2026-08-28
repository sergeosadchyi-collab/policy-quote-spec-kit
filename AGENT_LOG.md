# Agent Log

Chronological record of every significant AI agent interaction for PolicyQuote.
Format and rules are defined in `CLAUDE.md` → *Agent Logging Protocol*.

| # | Date | Scope | Title | Outcome |
|---|------|-------|-------|---------|
| 1 | 2026-08-28 | docs | Agent logging protocol | accepted |
| 2 | 2026-08-28 | docs | AGENTS.md universal entrypoint | accepted |
| 3 | 2026-08-28 | docs | Implementation plan & Phase 0/1 design artifacts | accepted with edits |
| 4 | 2026-08-28 | docs | Task breakdown (tasks.md) for 001-policy-quote-app | accepted with edits |
| 5 | 2026-08-28 | docs | Applied `/speckit-analyze` remediation to spec.md, plan.md, data-model.md, tasks.md | accepted with edits |

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

---

### Entry 4 — 2026-08-28 21:35 — Task breakdown (tasks.md) for 001-policy-quote-app

**Agent/Model:** GitHub Copilot CLI / Claude Opus 5
**Scope:** docs

**Prompt given (verbatim):**
> The user explicitly invoked the "/speckit-tasks" skill. Follow its instructions now.

(invoked with empty user input)

**Output received:**
Checked the `before_tasks` extension hook — `speckit.git.commit` is optional and
the working tree was clean (plan artifacts already committed), so it was reported
and skipped. Ran `.specify/scripts/bash/setup-tasks.sh --json`, which reported all
four optional design docs present.

Generated `specs/001-policy-quote-app/tasks.md`: 65 tasks (T001–T065) across
seven phases — Setup (7), Foundational (9), US1 (16), US2 (7), US3 (14), US4 (5),
Polish (7). 34 tasks marked `[P]`. Includes a dependency graph, per-phase parallel
opportunities, a worked parallel example for US1, and an MVP-first / incremental
delivery strategy.

Test tasks were included rather than treated as optional, because Constitution
Principle VII mandates Jest coverage of all three bands, SC-006 requires an
asserting test per band, and FR-012 requires each KB validation failure to be
verifiable.

**What I changed:**
Three corrections made during the run rather than accepted as first drafted:

1. **The TypeScript run strategy was verified, not assumed.** The first draft
   added `tsx` as a devDependency to get a single `npm start` with no build step.
   Before committing to that I tested Node 22.22.3's native type stripping in
   `/tmp` with a two-file ESM/TS fixture — it worked, including `import type`
   and explicit `.ts` extensions. Dropped `tsx` entirely: `"start": "node
   src/server.ts"`. This removes a dependency and a build step, but it forces
   `erasableSyntaxOnly` and explicit `.ts` import extensions, so those are now
   spelled out in T003 and T004 rather than left to be discovered.
2. **Rebalanced the story split.** My first cut put the whole scoring engine in
   Foundational, which would have made US1 trivial and the phase boundaries
   dishonest. Moved the engine into US1 (a premium *requires* a score, so it
   cannot be deferred) and left Foundational as the genuine shared skeleton: KB
   file, schema, loader, transport types, handler/adapter skeleton, app shell.
   US2 then adds only the explanation *surfaces*, which matches the spec's own
   acceptance scenarios — US1's scenarios mention only premiums, US2's mention
   band, factors, summary and breakdown.
3. **Added an explicit honesty note on story independence.** The template asserts
   stories are independent; here US2 and US3 extend modules first created in US1,
   so they are independently *testable* but not independently *buildable*. Said
   so in the Dependencies section instead of letting the template's boilerplate
   imply otherwise.

**What I rejected and why:**
- **Rejected splitting compound conditions out of US3 into Foundational.** They
  belong with the configurability story: US3 is where the KB's expressiveness
  claim is proven, and putting `all`/`any`/`not` earlier would have made US3
  mostly validation chores.
- **Rejected a "write the final risk-kb.json" task in Foundational.** T008 seeds
  a leaf-only KB and T053 extends it once the compound and per-occurrence
  capabilities exist. Authoring KB entries the engine cannot yet evaluate would
  make the Foundational checkpoint unverifiable.
- **Rejected putting rich validation error mapping in US1.** US1 needs the Zod
  request schema to build a `QuoteRequest` at all, but field-level `issues[]`
  and the frontend error surfaces are exactly what US4 exists to deliver.
  Splitting it this way keeps US4 a real increment rather than a cosmetic one.
- **Rejected the template's sample tasks wholesale** (database migrations,
  auth/authorization framework, environment configuration). This feature has no
  persistence, no accounts, and no environment-dependent config by design — the
  spec's Assumptions rule all three out.

**Why (reasoning):**
Phase ordering follows the constitution's own dependency logic: lookup tables
before the evaluator that dispatches through them, evaluator before scoring,
scoring before band resolution, band before premium, premium before summary
composition — because the summary template may reference the premium. The two
standing prohibitions (no `any`, no scoring constants) are stated once at the top
of the file and restated in the closing Notes as a "if a task seems to need a
hardcoded value, the task is wrong" rule, so an implementing agent meets them
before reading any individual task. `AGENT_LOG.md` is called out as a standing
per-task obligation rather than a single polish task, since Principle VI requires
logging in the same change, not as a cleanup pass.

**Validation:** Wrote a Node script to parse `tasks.md` against the required
`- [ ] T### [P?] [US#?] description` format: 65 task lines, 0 malformed, IDs
strictly sequential T001–T065 with no gaps, story labels present on all and only
story-phase tasks (Setup/Foundational/Polish = 23 unlabelled, US1=16, US2=7,
US3=14, US4=5). One task (T063) names a command rather than a file path, which is
intended for a verification task. Node native type stripping confirmed working on
22.22.3 before being written into T002; the `/tmp` fixture was deleted afterwards.
**Files touched:** `specs/001-policy-quote-app/tasks.md`, `AGENT_LOG.md`

---

### Entry 5 — 2026-08-28 21:50 — Applied `/speckit-analyze` remediation across the spec artifacts

**Agent/Model:** GitHub Copilot CLI / Claude Sonnet 5
**Scope:** docs (specs/001-policy-quote-app)

**Prompt given (verbatim):**
> /speckit-analyze

then, after the report was presented:

> Yes, suggest

then:

> yes, apply

**Output received:**
The read-only analysis produced 13 findings across the three core artifacts, a
coverage table over all 39 requirement keys (30 FR + 9 SC) and metrics: FR
coverage 100%, SC coverage 78%, combined 95%, with **1 CRITICAL**. On approval
the agent applied the remediation to four files:

- `spec.md` — added **FR-002a** (explicit numeric bounds for age, property value,
  claim count and name length); extended **FR-006** so a risk band carries both a
  machine identifier and a separate customer-facing label; added `risk band label`
  to the Quote Result entity and rewrote the Risk Band entity's opening clause.
- `plan.md` — Technical Context scale line corrected from "30 functional
  requirements / ~12 backend modules" to "31 functional requirements / ~19 backend
  source modules".
- `data-model.md` — §1 sources re-pointed at FR-002a, and a **canonical UK postcode
  regex** pinned in one place with an explicit instruction that both the server
  schema and the client form use that exact rule.
- `tasks.md` — rewritten and renumbered from 65 to **70** tasks.

The task restructuring was the substantive part:

- **C1 (CRITICAL, Principle III)** — User Story 1's checkpoint was labelled
  "demo-ready" while the 200 response carried only `monthlyPremium` and
  `annualPremium`; six required fields arrived in US2 and `kbVersion` in US3.
  Moved the summary-composer test and implementation into US1, folded the
  `kbVersion` task into US1's handler wiring, and deleted the old US2 backend task
  entirely. US2 is now presentation-only (3 tasks).
- **C2 (HIGH)** — FR-012/FR-013b are unconditional but KB cross-validation and the
  semver gate sat in US3, so Phase 2 could complete with an invalid KB accepted.
  Split the work by schema dependency: placeholder-set constant, band
  contiguity/unique-id/placeholder checks and the version gate moved into
  Foundational; the checks that need the recursive schema (unknown operator, empty
  group, `perOccurrence` without `occurrenceField`) stayed in US3.
- **G1/G3/G4** — added `determinism.test.ts` (20 identical invocations must be
  byte-identical, plus a static check that `backend/src/engine/` references no
  `Date`/`Math.random`/`process.env`/network API), `condition-evaluator.test.ts`,
  and `scoring.test.ts` including the overlapping-factors edge case.
- **G2** — added a Polish task validating `risk-kb.json` against
  `contracts/risk-kb.schema.json` and handler responses against the OpenAPI file,
  so the published contracts cannot drift from the Zod runtime authority.

**What I changed:**
Accepted as-is. The remediation set was reviewed finding-by-finding before
approval rather than applied wholesale on trust.

**What I rejected and why:**

- **I2** — the agent offered a new FR-010c to give the `startsWith` operator its
  own functional requirement. Rejected: FR-010/FR-010a already require the
  operator set to be KB-declared and open to extension, so naming one operator in
  the spec would push an implementation detail up into the requirements and invite
  a new FR for every future operator.
- **A1 / D1** — flagged by the analysis as no-action; not applied.
- The agent's first instinct on C1 was to relax the User Story 1 checkpoint
  wording to "partial demo". Rejected outright — Principle III is non-negotiable
  and the constitution says a conflict is resolved by changing the spec, plan or
  tasks, never by diluting the principle. The fix had to move the work earlier,
  not lower the bar.

**Why (reasoning):**
Every edit tightens a constraint rather than loosening one. C1 and C2 both existed
because *sequencing* silently violated a MUST that the artifacts stated correctly
in prose — the response contract and the KB safety guarantees are unconditional,
so no phase boundary may sit in front of them. FR-002a exists so that "outside
accepted ranges" is measurable and SC-007 has an agreed threshold to test against;
the single pinned postcode regex exists so client and server cannot drift into
disagreeing about validity. The band `id`/`label` split keeps customer-facing
wording in the KB where Principle I requires it, so rewording a band for customers
is a KB edit and not a contract change. The determinism task makes SC-008
falsifiable rather than aspirational.

No scoring value, band boundary or factor identifier was introduced into any task
description; the new tasks explicitly forbid them, and the contract test task
requires expected values to be computed from the loaded KB rather than restated as
literals.

**Validation:** Re-ran the tasks.md format validator — 70 tasks, IDs sequential
T001–T070 with zero malformed lines, and story-label distribution exactly as
designed (29 unlabelled across Setup 7 + Foundational 14 + Polish 8; US1 21,
US2 3, US3 12, US4 5). No source code exists yet, so there is no test suite to run.
**Files touched:** `specs/001-policy-quote-app/spec.md`, `specs/001-policy-quote-app/plan.md`, `specs/001-policy-quote-app/data-model.md`, `specs/001-policy-quote-app/tasks.md`, `AGENT_LOG.md`
