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
| 6 | 2026-08-28 | infra | Phase 1 Setup: workspace scaffolding and toolchain verification | accepted with edits |
| 7 | 2026-08-28 | kb, backend | Phase 2 Foundational: Knowledge Base, loader and fail-fast startup | accepted with edits |
| 8 | 2026-08-28 | docs, kb | Spec defect: monthly rounding could breach FR-004a | corrected artifacts |
| 9 | 2026-08-28 | backend, frontend, tests | User Story 1: quote calculation engine, handler pipeline and UI | accepted with edits |
| 10 | 2026-08-29 | frontend | User Story 2: making the quote explainable | accepted with edits |
| 11 | 2026-08-29 | backend, kb, tests | User Story 3: recursive conditions, and a contract conflict I had introduced | corrected implementation |
| 12 | 2026-08-29 | backend, frontend, tests | User Story 4: field-attributed validation and network failure | accepted with edits |
| 13 | 2026-08-29 | tests, docs, frontend | Polish: contract conformance, compliance audit and documentation | accepted with edits |

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

---

### Entry 6 — 2026-08-28 22:10 — Phase 1 Setup: workspace scaffolding and toolchain verification

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** infra

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T001–T007. Created `.gitignore` (none existed at the repository root),
the `backend/` package (`package.json` as ESM with `"start": "node src/server.ts"`,
`tsconfig.json`, `jest.config.js`), and scaffolded the frontend with
`npx @angular/cli@20 new frontend` (Angular 20.3.0). Stripped `zone.js` from
`angular.json`, wired `proxy.conf.json`, deleted the generated `app.config.ts`,
`app.spec.ts` and `app.html`, and rewrote `main.ts` around
`provideZonelessChangeDetection()` + `provideHttpClient()`.

**What I changed:**
I did not accept the toolchain on faith. Before writing any real code I wrote a
throwaway smoke test to prove that native TypeScript type stripping and Jest both
actually worked. It failed first time — `Cannot find module '../../src/engine/__smoke.js'`
— because ts-jest rewrites `./x.ts` specifiers to `./x.js` on emit and Jest then
cannot resolve them. I added a `moduleNameMapper` stripping both `.js` and `.ts`
extensions, re-ran, and confirmed both Jest and `node src/engine/__smoke2.ts`
succeeded before deleting the smoke files.

Also repaired a tooling slip of my own: `npm pkg delete dependencies.zone.js`
misparsed the dotted key and left a stray empty `"zone": {}` in `package.json`,
which I removed with a small Node script.

**What I rejected and why:**
Rejected adding `tsx` or a build step to the backend. The plan commits to Node 22
native type stripping, and introducing a transpiler would have made the "run it
with `node`" story untrue. Rejected leaving `zone.js` in place "because it is the
default" — Principle II requires zoneless signals, and a dormant zone.js would
have quietly permitted zone-based change detection to creep back in.

**Why (reasoning):**
The `.gitignore` mattered more than it looks: without it, `node_modules/` would
have been committed, and SC-004 is verified by diffing a KB-only change — a diff
polluted by dependencies is not a demonstrable success criterion. Verifying the
toolchain empirically rather than assuming it is what surfaced the ts-jest
extension-rewriting problem at a point where it cost one smoke test, instead of
midway through the first real test suite.

**Validation:** Smoke test passed under both Jest and bare `node`; both smoke
files then deleted. `npx ng build` succeeded on the scaffold.
**Files touched:** `.gitignore`, `backend/package.json`, `backend/tsconfig.json`, `backend/jest.config.js`, `frontend/angular.json`, `frontend/proxy.conf.json`, `frontend/src/main.ts`

---

### Entry 7 — 2026-08-28 22:40 — Phase 2 Foundational: Knowledge Base, loader and fail-fast startup

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** kb, backend

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T008–T021. Authored `risk-kb.json` at the repository root (v1.0.0,
`basePremium` 300, `coverageLoadFactor` 1.2; three contiguous bands; four
leaf-condition factors totalling a maximum of 70 so that every band is reachable).
Implemented the `kb/` module (`kb-errors.ts`, `kb-schema.ts`,
`kb-cross-validation.ts`, `kb-loader.ts`, `supported-versions.ts`), the transport
types, `api/response-types.ts`, the `handler.ts` skeleton, `server.ts` over
`node:http`, and the frontend `models/quote.ts` plus app shell and global CSS.
Wrote `tests/kb/kb-validation.test.ts` (15 cases) — all passing.

**What I changed:**
Fixed a grammar slip in a customer-visible-adjacent error message ("a overlap" →
"an overlap"). Added `@types/jest` and `"jest"` to the tsconfig `types` array
after `tsc --noEmit` failed with `Cannot find name 'describe'` — the test files
are inside the typechecked project, so the types have to be present for the
typecheck to mean anything.

**What I rejected and why:**
Rejected putting `risk-kb.json` under `backend/src/`, which is where a
conventional layout would place it. The brief requires the KB to be visible and
not buried in source folders, and SC-004 is proven by showing a reviewer a
one-file diff — burying it would have undermined the demonstration. Rejected
expressing the response types as Zod schemas: nothing parses a response, so a
schema there would be a second, unenforced authority that could drift from the
interfaces the code actually uses.

Rejected a `switch` over band ids in the resolver before it was written: bands are
KB data, so `band-resolver.ts` locates the highest and lowest band *positionally*
in the ordered array and contains no band id at all. This is only sound because
cross-validation separately enforces ascending declared order — the two rules are
a deliberate pair, and neither may be removed alone.

**Why (reasoning):**
Load order in `kb-loader.ts` is read → `JSON.parse` → Zod → semver gate →
cross-validation. The version gate sits *after* structural validation on purpose:
a file too malformed to have a readable `version` should be reported as malformed,
not as an unsupported version, or the operator is sent looking in the wrong place.
Cross-validation exists because Zod can check a band in isolation but cannot see
that two bands overlap or that a gap leaves some score unbandable — and an
unbandable score would mean a customer with no quote.

**Validation:** 15 KB validation tests pass. Verified the fail-fast behaviour live
rather than only in tests: started the server (`node src/server.ts`), confirmed
`405` on GET, then introduced a deliberate band gap into `risk-kb.json` and
confirmed the process refused to start and named the problem. Restored the KB from
backup afterwards. `tsc --noEmit` exits 0.
**Files touched:** `risk-kb.json`, `backend/src/kb/*.ts`, `backend/src/types/lambda.ts`, `backend/src/api/response-types.ts`, `backend/src/handler.ts`, `backend/src/server.ts`, `backend/tests/kb/kb-validation.test.ts`, `frontend/src/app/models/quote.ts`, `frontend/src/styles.css`

---

### Entry 8 — 2026-08-28 23:05 — Spec defect: monthly rounding could breach FR-004a

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** docs, kb

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
While preparing the Phase 3 money tests I found that `research.md` R8 asserted
that deriving the monthly premium from the already-rounded annual figure
"guarantees monthly × 12 ≤ annual". That claim is false. Counterexample: an annual
premium of £360.10 gives £30.008333…, which half-up rounds to £30.01, and
£30.01 × 12 = £360.12 — twelve pence *above* the annual price. FR-004a states the
relationship as a MUST, so the artifacts contradicted themselves.

**What I changed:**
Resolved in favour of the MUST rather than in favour of the convenient rounding
rule: the monthly premium now uses directed rounding **down** (`floorToPence`),
so twelve instalments can never exceed the annual price. Amended `research.md` R8
to strike the false guarantee, `spec.md` FR-004a to make the rounding *direction*
normative and to carry the worked counterexample, `data-model.md` §8, and the
`monthlyPremium` description in the OpenAPI contract.

**What I rejected and why:**
Rejected the easier fix of weakening FR-004a to "approximately equal" or dropping
the inequality. Charging a customer more in instalments than the advertised annual
price is a real-world pricing defect, not a rounding pedantry, and the requirement
was right — the research note was wrong. Rejected computing the monthly figure
from the *unrounded* annual, which would have made the two published numbers
mutually inconsistent.

**Why (reasoning):**
This is exactly the class of defect the constitution's determinism and
explainability principles are meant to expose: both statements looked reasonable
in isolation and only conflicted on specific inputs. Recording it here rather than
silently fixing the code keeps the artifacts honest about the fact that the
original research note was wrong.

**Validation:** Encoded the counterexample as a test in `money.test.ts`; it fails
under half-up and passes under `floorToPence`.
**Files touched:** `specs/001-policy-quote-app/research.md`, `specs/001-policy-quote-app/spec.md`, `specs/001-policy-quote-app/data-model.md`, `specs/001-policy-quote-app/contracts/policy-quote.openapi.yaml`

---

### Entry 9 — 2026-08-28 23:50 — User Story 1: quote calculation engine, handler pipeline and UI

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** backend, frontend, tests

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T022–T042 test-first. Wrote nine test suites and three fixture helpers,
confirmed they failed for the right reason (9 suites failing, 31 assertions), then
implemented `money.ts`, `operators.ts`, `condition-evaluator.ts`, `scoring.ts`,
`band-resolver.ts`, `premium-calculator.ts`, `summary-composer.ts` and
`api/request-schema.ts`, wired the full pipeline into `handler.ts`, and built the
frontend `QuoteApi` service, `QuoteFormComponent` and `QuoteResultComponent`.

**What I changed:**
Two suites failed on the first full run and in both cases the *test* was wrong,
not the implementation — worth recording rather than quietly patching:

1. The summary-composer placeholder test supplied two applied factors and then
   asserted the output contained only the substituted template, ignoring the
   factor sentence the component is required to append. Fixed the fixture to pass
   an empty factor list, which is what that test was actually about.
2. The band-resolver "re-banded KB" test widened the first band to 0–40 and moved
   the second to start at 41 but left its `max` at 30, producing `max < min`. The
   KB fixture correctly refused to parse it. Fixed the fixture to describe a
   coherent re-banding.

Also replaced indexed access into a `profiles` array in `determinism.test.ts` with
named constants, because `noUncheckedIndexedAccess` widened them to
`string | undefined` and broke `tsc --noEmit`.

Rounding is implemented as two distinct functions with an epsilon nudge in each:
`roundToPence` is half-away-from-zero (plain `Math.round(1.005 * 100) / 100` gives
1.00, which is wrong), and `floorToPence` nudges by 4 ULP before flooring because
`45.6 * 100` evaluates to `4559.999999999999` and a bare floor would lose a penny.

**What I rejected and why:**
Rejected a `switch (condition.operator)` in the evaluator in favour of a frozen
`LEAF_OPERATORS` lookup — Principle I forbids per-factor control flow in code, and
a switch is exactly the shape that invites a hardcoded special case later.
Rejected having `evaluateCondition` return `false` on an unknown field or
operator: silently scoring zero for a factor the KB author believed was active is
a wrong quote delivered confidently, so it throws instead. Rejected authoring any
fallback risk prose in `composeSummary` for the empty-factor case — it appends
nothing, because inventing customer-facing risk wording in code is precisely what
Principle I exists to prevent.

**Why (reasoning):**
`handler.ts` exports `createQuoteHandler(kb)` alongside the root-KB-bound
`handler` so that contract tests can inject a fixture KB and compute their
expectations *from the loaded KB* rather than restating scoring literals as test
constants — a test full of hardcoded points would violate Principle I just as
surely as production code would. The body is decoded to `unknown` and handed
straight to Zod, so a null body, non-JSON text or a bare JSON array all become a
400 rather than a crash.

**Validation:** Full backend suite green — 112 tests across 10 suites; `tsc
--noEmit` exits 0; `ng build` succeeds. Verified the checkpoint against the
running server rather than trusting the tests alone: a low-risk profile returns
STANDARD with `riskScore` 0, an empty `appliedFactors` array and all nine
contract fields; a high-risk profile returns HIGH_RISK at `riskScore` 70 with four
factors whose points sum to exactly 70; and a malformed body returns 400.
**Files touched:** `backend/src/engine/*.ts`, `backend/src/api/request-schema.ts`, `backend/src/handler.ts`, `backend/tests/unit/*.test.ts`, `backend/tests/contract/handler-bands.test.ts`, `backend/tests/helpers/*.ts`, `frontend/src/app/services/quote-api.ts`, `frontend/src/app/quote-form/`, `frontend/src/app/quote-result/`, `frontend/src/app/app.ts`, `frontend/src/app/app.css`

---

### Entry 10 — 2026-08-29 00:20 — User Story 2: making the quote explainable

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** frontend

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T043–T045. Built `RiskBandBadgeComponent` (signal inputs for `riskBand`
and `label`), `AppliedFactorsComponent`, and extended `QuoteResultComponent` with
the badge, the KB-authored risk summary and a coverage breakdown that multiplies
out to the annual premium.

**What I changed:**
Put ALL structural styling in the badge's base `.badge` rule and let the
per-band rules add colour only, so a band id added to the KB after this file was
written still renders as a presentable neutral badge rather than as unstyled
text. Sanitised the id into a class name (lowercase, non-alphanumerics collapsed
to hyphens) so an arbitrary KB id cannot produce a malformed selector.

**What I rejected and why:**
Rejected passing only `riskBand` and deriving the display text from it in the
component — that is the id→text map Principle I forbids, and it would mean
rewording a band for customers required a frontend change. Both strings are
passed, the id styles and the label renders.

Rejected recomputing the annual premium client-side to "check" the breakdown. If
base × multiplier × load did not equal the displayed annual, that would be a real
backend defect, and papering over it with a client-side recalculation would hide
it from exactly the person best placed to notice.

Rejected omitting the applied-factors section when no factors matched. "No risk
factors applied" is itself an explanation; a blank space leaves the customer
unable to tell whether the answer was "none" or whether the page had broken.

**Why (reasoning):**
Every description is printed verbatim from the response, which took it verbatim
from the KB. There is no dictionary, map or `switch` anywhere in these
components, which is what makes SC-005 — reword a factor by editing the KB — true
rather than merely claimed.

**Validation:** `ng build` succeeds. Verified against live responses that a
STANDARD quote renders the empty-factor state and a HIGH_RISK quote renders four
factors whose points sum to the displayed score.
**Files touched:** `frontend/src/app/risk-band-badge/`, `frontend/src/app/applied-factors/`, `frontend/src/app/quote-result/`, `frontend/src/styles.css`

---

### Entry 11 — 2026-08-29 00:55 — User Story 3: recursive conditions, and a contract conflict I had introduced

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** backend, kb, tests

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T046–T057 test-first. Wrote five test suites (combinators,
per-occurrence scoring, `startsWith`, extended KB validation, and a KB-only-change
contract test), confirmed 22 assertions failed, then implemented the recursive
`Condition` union via `z.lazy()`, the frozen `GROUP_COMBINATORS` table, the
recursive evaluator, the `startsWith` operator, per-occurrence scoring, and the
schema-dependent cross-validation rules.

**What I changed:**
Three corrections worth recording:

1. **I had implemented `not` incorrectly.** I wrote it as NOT(a AND b) and even
   wrote a test asserting that reading. The published contract
   (`contracts/risk-kb.schema.json`) already defined `not` as "true when no child
   matches" — i.e. NOR. Both readings are defensible in the abstract, but the
   contract had already fixed the meaning, and silently diverging from it is
   precisely the drift the conformance test exists to catch. I changed the
   implementation to `!members.some(...)` and rewrote the test to pin the
   published meaning, noting in the test why the two readings coincide for the
   common single-member case.

2. The published contract declares `startsWith` as a separate branch requiring a
   **string** operand. I had lumped it in with `eq`/`gt`/`gte`, which would have
   allowed `startsWith: 42`. Split it into its own schema branch.

3. The unknown-operator test failed with `factors.0.condition: Invalid input` —
   technically a rejection, but useless. A closed Zod union reports a bare
   "Invalid input" and never mentions which rule broke. I added `describeOwner`
   to the loader, which reads the offending factor or band id from the RAW JSON
   (parsing has by definition failed, so the parsed result is unavailable) and
   appends it to the message. FR-012 asks for the offending factor to be named;
   the path alone does not do that.

**What I rejected and why:**
Rejected inferring the per-occurrence count field from the condition. It reads as
a convenience until the condition is compound — a rule about flats *with claims*
spans two fields and has no unambiguous one to count. The KB author nominates it
explicitly via `occurrenceField`, and the schema refuses `perOccurrence` without
it.

Rejected listing a zero-count per-occurrence factor as "+0". It explains nothing
and invites the customer to ask why they are being shown a factor they were not
charged for.

Rejected allowing empty `all`/`any`/`not` groups. `all: []` is vacuously true and
would apply its points to every customer unconditionally — a silent mis-pricing
with no visible symptom.

**Why (reasoning):**
The evaluator resolves groups and leaves through one entry point, so nesting
depth is never a special case and a factor of any structural complexity remains a
KB-only addition (FR-010b). `GROUP_COMBINATORS` mirrors `LEAF_OPERATORS`
deliberately: both are frozen tables, and neither the evaluator nor anything
downstream gains a branch when an entry is added.

Extended `risk-kb.json` with a compound `all` factor (flat AND over £500k — the
brief's own example), a per-occurrence claims factor replacing the previous flat
one, and a postcode-area factor using an `any` group over two `startsWith` leaves.

**Validation:** 138 tests across 14 suites pass; `tsc --noEmit` exits 0. Verified
the extended KB against the running server: a flat worth £620k in TR1 with two
claims scores 92 (HIGH_RISK), with the per-occurrence factor contributing 24
(12 × 2), the compound factor and the postcode group both firing, and the listed
points summing exactly to 92.
**Files touched:** `backend/src/kb/kb-schema.ts`, `backend/src/kb/kb-cross-validation.ts`, `backend/src/kb/kb-loader.ts`, `backend/src/engine/combinators.ts`, `backend/src/engine/condition-evaluator.ts`, `backend/src/engine/operators.ts`, `backend/src/engine/scoring.ts`, `backend/tests/unit/*.test.ts`, `backend/tests/contract/kb-only-change.test.ts`, `risk-kb.json`

---

### Entry 12 — 2026-08-29 01:25 — User Story 4: field-attributed validation and network failure

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** backend, frontend, tests

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T058–T062. Wrote `tests/contract/handler-validation.test.ts` covering
every invalid category from FR-002a, implemented `api/error-mapping.ts`, returned
400 with `issues[]` from the handler, and rebuilt the frontend form with mirrored
validators, per-field messages and network-failure handling.

**What I changed:**
Split `decodeBody` into three distinguishable failures — absent body, not JSON,
and JSON-but-not-an-object — rather than collapsing them into one generic
message. They have different causes, and a single message leaves the caller
guessing which they hit.

Deduplicated issues by field. Zod can raise several complaints about one input
(wrong type *and* out of range); showing a customer two errors under one box
reads as a malfunction.

On the client, server-returned issues are held separately from the reactive
form's own errors, because they have a different lifetime: a server complaint
must clear the moment the customer edits that field, since the server has not
seen the new value.

**What I rejected and why:**
Rejected passing Zod's own messages through. Every message shown is one authored
in the request schema for a customer to read; the test explicitly asserts that
nothing matching `invalid_type` or `expected … received …` can reach a response.

Rejected treating the client validators as authoritative. They exist purely so
the customer is not made to wait for a round trip to be told something obvious —
the backend revalidates everything. The postcode pattern is transcribed from the
same canonical source as the server's, so the two cannot disagree about validity
and strand a customer with a postcode the server would have accepted.

Rejected leaving a previously rendered quote on screen after a failed
resubmission. It would look like the answer to the details currently in the form.
The form now emits `null` on failure so the shell clears it.

**Why (reasoning):**
SC-007 is the reason for the "no premium figure anywhere" assertion, which is
applied to every invalid case rather than a sample: a response that carried both
an error and a figure would invite a client to render a price derived from
details the system had already judged invalid. Status 0 is distinguished from a
5xx on the client because "we could not reach the service" and "the service
failed" are different situations for the customer, and only one suggests checking
their connection.

**Validation:** 169 tests across 15 suites pass, including 11 invalid categories
each asserted twice (field-specific issue, and no premium anywhere in the
response), all five unusable-body shapes, the multi-field case, base64 bodies, and
both inclusive age boundaries returning 200. `ng build` succeeds.
**Files touched:** `backend/src/api/error-mapping.ts`, `backend/src/handler.ts`, `backend/tests/contract/handler-validation.test.ts`, `frontend/src/app/quote-form/quote-form.ts`, `frontend/src/app/quote-form/quote-validators.ts`, `frontend/src/app/quote-form/quote-form.css`, `frontend/src/app/app.ts`

---

### Entry 13 — 2026-08-29 02:10 — Polish: contract conformance, compliance audit and documentation

**Agent/Model:** GitHub Copilot / Claude Sonnet 5
**Scope:** tests, docs, frontend

**Prompt given (verbatim):**
> /speckit-implement

**Output received:**
Executed T063–T070. Added `tests/contract/contract-conformance.test.ts` validating
the shipped `risk-kb.json` against the published JSON Schema and real handler
responses against the OpenAPI document; ran the constitution compliance audit;
wrote `README.md` and `SOLUTION.md`; refined responsive and accessibility CSS.

**What I changed:**
Three problems surfaced, none of which the tests alone would have shown:

1. Ajv caches compiled schemas by `$id` and throws on recompiling the same
   document. My second conformance test compiled the schema again and failed with
   a message about a duplicate key — which initially looked like a contract
   defect. It was not; I hoisted the compiled validator so both tests share it.
2. The conformance test passed under Jest but broke `tsc --noEmit`: Ajv ships
   ESM-syntax declarations inside a CommonJS package, so under NodeNext a plain
   default import is not callable. I first tried enabling `esModuleInterop`,
   which made things worse — its synthetic default shadows Ajv's declared one, so
   `.default` resolved back to the namespace. Reverted it and used the named
   `Ajv2020` export instead, which is real in both the typings and at runtime.
   ajv-formats has only a default, so its namespace is narrowed to the published
   `FormatsPlugin` interface rather than to `any`.
3. Added an assertion that the published schema actually REJECTS things
   (`basePremium: "free"`, empty `riskBands`, an unknown key). A schema that
   accepted everything would have passed the positive test while protecting
   nothing.

**What I rejected and why:**
Rejected rewriting the OpenAPI `$ref`s to make them easier to validate. The refs
are registered under the exact `#/components/schemas/...` keys the document uses,
so the published document is exercised as written — a test against a rewritten
copy would not prove the published one is correct.

Rejected leaving the flood-zone demonstration factor in `risk-kb.json` after
running it. It duplicates the `coastal_flood_area` factor already shipped, and a
KB carrying leftovers from a walkthrough is untidy for a reviewer.

**Why (reasoning):**
The conformance tests exist because the published contracts and the Zod runtime
authority are two statements of the same thing, and nothing but a test keeps them
honest. This has already paid for itself: the `not` combinator and `startsWith`
operand type in Entry 11 were both caught by comparing against the published
contract.

The compliance audit found zero occurrences of `any`, zero `switch` statements
(the only matches are comments explaining why there are none), zero factor
identifiers in code, and zero band identifiers outside the badge's CSS styling
hooks. The single numeric literal in the whole engine is `/ 12` in the monthly
calculation — months in a year, a calendar fact rather than a pricing value.

**Validation:** 176 tests across 16 suites pass; `tsc --noEmit` exits 0;
`ng build` succeeds. Executed the quickstart end to end: appended the flood-zone
factor to `risk-kb.json`, restarted, and confirmed an `EX4 4QJ` quote picked it up
with its new description and 15 points — no code touched — then restored the KB.
Verified the full stack through the Angular dev-server proxy: a high-risk profile
returned HIGH_RISK at score 112 and £66/month, and £66 × 12 = £792 exactly equals
the annual premium, satisfying FR-004a. `SOLUTION.md` is 278 words, within the
300-word limit.
**Files touched:** `backend/tests/contract/contract-conformance.test.ts`, `backend/package.json`, `README.md`, `SOLUTION.md`, `frontend/src/styles.css`, `frontend/src/app/quote-form/`, `frontend/src/app/quote-result/quote-result.css`, `specs/001-policy-quote-app/tasks.md`
