---
description: "Task list for PolicyQuote implementation"
---

# Tasks: PolicyQuote — Home Insurance Quoting Tool

**Input**: Design documents from `/specs/001-policy-quote-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks **are** included. They are not optional here — Constitution
Principle VII mandates Jest coverage of all three risk bands, SC-006 requires
each band to have an asserting test, and FR-012 requires each KB validation
failure to be verifiable.

**Organization**: Tasks are grouped by user story so each story can be
implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every task

## Path Conventions

Two-package web application per plan.md: `backend/src/`, `frontend/src/`, with
**`risk-kb.json` at the repository root** (deliberately not inside `backend/`).

## ⚠️ Standing obligation on every task

Constitution Principle VI is non-negotiable: append an `AGENT_LOG.md` entry
**in the same change** as the work, not as a cleanup pass. One entry per logical
change, prompts quoted verbatim, rejected output recorded. Do not end a session
with code changed and `AGENT_LOG.md` untouched.

Two prohibitions apply to every implementation task below:

- **No scoring constants in application code** — no point values, band
  boundaries, or factor identifiers. If a task seems to need one, it belongs in
  `risk-kb.json`.
- **No `any`** — use `unknown` plus narrowing at trust boundaries.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and toolchain configuration

- [ ] T001 Create the two-package structure per plan.md: `backend/src/`, `backend/tests/`, `frontend/` directories at the repository root
- [ ] T002 [P] Initialize the backend package in `backend/package.json`: dependencies `zod@^4`, `semver`; devDependencies `typescript@^5.6`, `jest@^30`, `ts-jest`, `@types/node`, `@types/jest`, `@types/semver`; scripts `"start": "node src/server.ts"` and `"test": "jest"` (Node 22.22.3 strips types natively — no build step, verified working)
- [ ] T003 [P] Configure `backend/tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `module: "nodenext"` — all relative imports must carry an explicit `.ts` extension for native type stripping
- [ ] T004 [P] Configure `backend/jest.config.js` for `ts-jest` with `roots: ["<rootDir>/tests"]` and resolution of explicit `.ts` import specifiers
- [ ] T005 [P] Scaffold the Angular 20.3.x standalone application in `frontend/` (no NgModules, CSS styling, no UI component library), with `"start": "ng serve"` in `frontend/package.json`
- [ ] T006 [P] Create `frontend/proxy.conf.json` routing `/policy/quote` to `http://localhost:3000` and reference it from the `serve` options in `frontend/angular.json` (removes CORS entirely — research R4)
- [ ] T007 [P] Configure zoneless bootstrap in `frontend/src/main.ts` using `bootstrapApplication` with `provideZonelessChangeDetection()` and `provideHttpClient()`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared skeleton every user story needs. Delivers no user-facing
value on its own.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Author the initial Knowledge Base at `risk-kb.json` (repository root) per `contracts/risk-kb.schema.json`: `version: "1.0.0"`, `basePremium`, `coverageLoadFactor`, three bands (each with `id`, `label`, `min`, `max`, `riskMultiplier`, `summaryTemplate`) that are contiguous and non-overlapping, and leaf-condition factors whose combinations can reach all three bands
- [ ] T009 [P] Define the narrow Lambda transport types `QuoteApiEvent`, `QuoteApiContext`, `QuoteApiResponse` in `backend/src/types/lambda.ts` per `contracts/lambda-handler.md` §1
- [ ] T010 [P] Define `KbNotFoundError`, `KbMalformedError`, `KbUnsupportedVersionError` as distinct classes in `backend/src/kb/kb-errors.ts` (the version failure is a separate spec edge case from the malformed failure and must carry both the version found and the range expected)
- [ ] T011 Define the Zod Knowledge Base schema in `backend/src/kb/kb-schema.ts` with all types exported via `z.infer<>` — KB root, `RiskBand`, `RiskFactor`, and **leaf conditions only** at this stage (the recursive group union arrives in US3); no hand-written interface may duplicate a schema
- [ ] T012 Implement `loadKnowledgeBase(filePath)` in `backend/src/kb/kb-loader.ts`: read file → `JSON.parse` → Zod validate, throwing the typed errors from T010 at each step (contracts/lambda-handler.md §3)
- [ ] T013 Implement the `node:http` adapter in `backend/src/server.ts` and the handler skeleton exporting `handler(event, context)` in `backend/src/handler.ts` — the adapter does event translation only and has no error branch; the handler returns 405 for non-POST and a structured 500 for unexpected faults, never throwing; the KB loads once at module init and any KB error writes to stderr and exits non-zero
- [ ] T014 [P] Define `QuoteResult`, `CoverageDetails`, `AppliedFactor`, `ValidationErrorResponse` and `ErrorResponse` types in `backend/src/api/response-types.ts` per `contracts/policy-quote.openapi.yaml`
- [ ] T015 [P] Mirror the API contract types in `frontend/src/app/models/quote.ts`
- [ ] T016 [P] Create the root standalone shell component `frontend/src/app/app.ts` with hand-authored global CSS (no Material, PrimeNG or Bootstrap — Principle V)

**Checkpoint**: Backend starts, refuses to start on a bad KB, answers 405 on the wrong method; frontend serves and proxies. No quote is produced yet.

---

## Phase 3: User Story 1 - Get an instant premium quote (Priority: P1) 🎯 MVP

**Goal**: A customer enters their details and receives a monthly and annual
premium in pounds sterling, with a loading indication and no duplicate
submission.

**Independent Test**: Enter a complete, valid set of details and confirm a
monthly and annual premium is displayed. Change an input, resubmit, and confirm
a fresh quote replaces the previous one.

### Tests for User Story 1

- [ ] T017 [P] [US1] Unit tests for `roundToPence` in `backend/tests/unit/money.test.ts`, including the `1.005` half-up case that naive `Math.round(v*100)/100` gets wrong
- [ ] T018 [P] [US1] Unit tests for every leaf operator (`eq`, `gt`, `gte`, `between`, `outside range`) in `backend/tests/unit/operators.test.ts`, asserting `between` and `outside range` are inclusive/exclusive at the exact bounds
- [ ] T019 [P] [US1] Unit tests for band resolution in `backend/tests/unit/band-resolver.test.ts` covering a score inside a band, a score exactly on each boundary, and a score above the top band clamping to the highest band rather than failing
- [ ] T020 [P] [US1] Unit tests for the premium calculator in `backend/tests/unit/premium-calculator.test.ts` asserting rounding happens at exactly the two points in FR-004a/b and that `monthlyPremium × 12 ≤ annualPremium`
- [ ] T021 [P] [US1] Contract tests in `backend/tests/contract/handler-bands.test.ts` invoking `handler()` directly with constructed events for one profile per band (STANDARD, ELEVATED, HIGH_RISK), with **expected values computed from the loaded KB**, never restated as literals (SC-006, Principle VII)

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement the Zod `QuoteRequest` schema with trim/uppercase normalisation in `backend/src/api/request-schema.ts` per data-model.md §1, so the engine only ever sees normalised input
- [ ] T023 [P] [US1] Implement `roundToPence` with epsilon-corrected half-up rounding in `backend/src/engine/money.ts` (research R8)
- [ ] T024 [P] [US1] Implement the frozen `LEAF_OPERATORS` lookup record in `backend/src/engine/operators.ts` — a `Record<LeafOperator, fn>`, never a `switch` (Principle I)
- [ ] T025 [US1] Implement `evaluateCondition(condition, request)` with leaf dispatch through the operator table in `backend/src/engine/condition-evaluator.ts` (depends on T024)
- [ ] T026 [US1] Implement `scoreRequest(kb, request)` in `backend/src/engine/scoring.ts`, iterating `kb.factors` generically and returning `{ riskScore, appliedFactors }` with no per-factor branching (depends on T025)
- [ ] T027 [US1] Implement `resolveBand(kb, score)` in `backend/src/engine/band-resolver.ts` using inclusive bounds and identifying the highest band **positionally** — no band `id` may appear in this file
- [ ] T028 [US1] Implement `calculatePremium(kb, band)` in `backend/src/engine/premium-calculator.ts` as `basePremium × riskMultiplier × coverageLoadFactor`, rounding the annual figure then deriving monthly from the rounded annual (depends on T023, T027)
- [ ] T029 [US1] Wire the pipeline in `backend/src/handler.ts`: parse request → score → resolve band → calculate premium → 200 with `monthlyPremium` and `annualPremium` (depends on T022, T026, T028)
- [ ] T030 [P] [US1] Implement `QuoteApiService.requestQuote()` posting to the relative path `/policy/quote` via `HttpClient` in `frontend/src/app/services/quote-api.ts`
- [ ] T031 [US1] Implement `QuoteFormComponent` in `frontend/src/app/quote-form/` — a reactive form over the six fields, with `loading`, `quoteResult` and `errorMessage` as `signal()` and `canSubmit` as `computed()` gating the submit control so duplicate submission is impossible by derived state (FR-017); no `BehaviorSubject`/`Subject`
- [ ] T032 [US1] Implement `QuoteResultComponent` in `frontend/src/app/quote-result/` displaying monthly and annual premium in pounds, replacing any previous result on resubmission (depends on T031)

**Checkpoint**: User Story 1 is fully functional — a valid submission returns and displays a premium. This is the MVP.

---

## Phase 4: User Story 2 - Understand why the premium is what it is (Priority: P2)

**Goal**: The customer sees a risk band badge, a plain-English summary, the
pricing breakdown, and the specific factors applied to their circumstances —
all sourced from the KB.

**Independent Test**: Submit a profile known to trigger specific factors and
confirm each is listed by its KB description, the badge matches the accumulated
score's band, and a readable summary and coverage breakdown are present. Submit
a profile triggering nothing and confirm STANDARD with no factors listed.

### Tests for User Story 2

- [ ] T033 [P] [US2] Unit tests for the summary composer in `backend/tests/unit/summary-composer.test.ts`: every published placeholder substitutes correctly, factor descriptions are appended, and an unknown placeholder raises a validation failure rather than substituting empty text (FR-014b)
- [ ] T034 [P] [US2] Contract tests in `backend/tests/contract/handler-explainability.test.ts` asserting `riskBand`, `riskBandLabel`, `riskScore`, `riskSummary`, `coverageDetails` and `appliedFactors` are present, that `appliedFactors[].points` sums exactly to `riskScore`, and that a no-match profile returns an empty `appliedFactors` array rather than an error

### Implementation for User Story 2

- [ ] T035 [US2] Implement `composeSummary()` in `backend/src/engine/summary-composer.ts` — substitute the closed placeholder set from data-model.md §10 into the resolved band's `summaryTemplate`, then append the applied factor descriptions; no prose may be authored in this file (FR-014a)
- [ ] T036 [US2] Extend the handler response in `backend/src/handler.ts` to carry `riskBand`, `riskBandLabel`, `riskScore`, `riskSummary`, `coverageDetails` and `appliedFactors`, with `appliedFactors[].points` being the contributed total (depends on T035)
- [ ] T037 [P] [US2] Implement `RiskBandBadgeComponent` in `frontend/src/app/risk-band-badge/` with signal `input.required<string>()` for `riskBand` (styling hook) and `label` (rendered text), plus hand-authored per-band CSS and neutral default styling for an unrecognised band id (constitution Technology Constraints)
- [ ] T038 [P] [US2] Implement `AppliedFactorsComponent` in `frontend/src/app/applied-factors/` rendering each `description` **verbatim from the response** with an explicit "no risk factors applied" empty state — no id→text map, dictionary or `switch` is permitted here (FR-016)
- [ ] T039 [US2] Extend `frontend/src/app/quote-result/` to render the badge, the risk summary, and the coverage breakdown (base premium, risk multiplier, coverage load factor, annual figure) so a customer can reconcile the arithmetic (depends on T037, T038)

**Checkpoint**: User Stories 1 and 2 both work independently. The quote is now explainable.

---

## Phase 5: User Story 3 - Change the risk rules without changing the product (Priority: P3)

**Goal**: A pricing specialist can add, retune or retire a factor, move a band
boundary, or reword an explanation by editing `risk-kb.json` alone — including
factors that combine two fields or accrue per occurrence — with the service
refusing to start on rules it may misinterpret.

**Independent Test**: Add a new factor to `risk-kb.json`, restart, submit a
matching profile, and confirm the factor appears with its new description and
changes the score — then confirm `git diff` touches `risk-kb.json` only.

### Tests for User Story 3

- [ ] T040 [P] [US3] Unit tests for `all`/`any`/`not` combinators and multi-level nesting in `backend/tests/unit/combinators.test.ts`, including the brief's "Flat AND over £500k" case
- [ ] T041 [P] [US3] Unit tests for per-occurrence scoring in `backend/tests/unit/scoring-per-occurrence.test.ts`: points multiply by the nominated `occurrenceField`, and a zero count contributes zero points **and is not listed** as applied
- [ ] T042 [P] [US3] Unit test for the `startsWith` operator in `backend/tests/unit/operators-startswith.test.ts` against normalised postcode values (Principle VII requires a new operator to ship with evaluator tests)
- [ ] T043 [P] [US3] KB validation tests in `backend/tests/kb/kb-validation.test.ts` — one asserting case per failure in contracts/lambda-handler.md §4: malformed JSON, unknown operator naming the offending factor, empty `all`/`any`/`not` group, `perOccurrence` without `occurrenceField`, band gap, band overlap, duplicate factor id, unknown summary placeholder, unsupported version reporting found-vs-expected — plus an **empty `factors` array succeeding** as a valid zero-score lowest-band quote
- [ ] T044 [P] [US3] KB-only-change test in `backend/tests/contract/kb-only-change.test.ts`: load a fixture KB, load the same KB with one extra factor appended, and assert the new factor appears in `appliedFactors` and shifts `riskScore` with no engine code involved (SC-003, SC-004)

### Implementation for User Story 3

- [ ] T045 [US3] Extend `backend/src/kb/kb-schema.ts` to the full recursive `Condition` union — leaf **or** group (`all`/`any`/`not`) via `z.lazy()` with an explicit type annotation, each group array non-empty — plus the `startsWith` leaf operator and the conditional requirement that `perOccurrence: true` implies `occurrenceField`; the union must stay closed (no `z.any()`/passthrough) so an unknown operator cannot reach the evaluator
- [ ] T046 [US3] Implement the frozen `GROUP_COMBINATORS` lookup record for `all`, `any` and `not` in `backend/src/engine/combinators.ts`
- [ ] T047 [US3] Make `evaluateCondition` recurse through the combinator table in `backend/src/engine/condition-evaluator.ts` so leaves and arbitrarily nested groups take the identical code path (FR-010b) (depends on T045, T046)
- [ ] T048 [US3] Add `startsWith` to `LEAF_OPERATORS` in `backend/src/engine/operators.ts` as a one-entry table addition (depends on T045)
- [ ] T049 [US3] Add per-occurrence multiplication to `backend/src/engine/scoring.ts` using the explicitly nominated `occurrenceField`, omitting zero-count factors from `appliedFactors`
- [ ] T050 [US3] Implement `backend/src/kb/kb-cross-validation.ts` performing all seven checks in contracts/lambda-handler.md §4 (band contiguity, unique factor ids, known request fields, known operators, non-empty groups, `occurrenceField` presence and numeric type, published placeholders), each error naming the offending node, and call it from `kb-loader.ts`
- [ ] T051 [P] [US3] Define `SUPPORTED_KB_VERSION_RANGE` in `backend/src/kb/supported-versions.ts` and enforce it with `semver.satisfies()` in `backend/src/kb/kb-loader.ts` **after** structural validation, failing startup with the version found and the range expected, with no coercion or downgrade (FR-013a/b)
- [ ] T052 [US3] Return the active `kbVersion` on every successful quote from `backend/src/handler.ts` (FR-013)
- [ ] T053 [US3] Extend `risk-kb.json` with a compound-condition factor (e.g. Flat AND value over £500,000) and a per-occurrence claims factor, exercising the capabilities added above

**Checkpoint**: All three stories work independently. The configurability claim is now demonstrable and enforced.

---

## Phase 6: User Story 4 - Be stopped from submitting bad details (Priority: P4)

**Goal**: Incomplete, malformed or out-of-range details produce a specific,
human-readable message identifying the problem, and never a premium.

**Independent Test**: Submit each category of invalid input and confirm a
specific message is shown and no quote is produced; stop the backend and confirm
a friendly error, cleared loading state, and a working retry without page reload.

### Tests for User Story 4

- [ ] T054 [P] [US4] Contract tests in `backend/tests/contract/handler-validation.test.ts` covering each invalid category — missing field, empty name, negative property value, negative claim count, implausible age, invalid property type, malformed postcode, `null` body, non-JSON body, JSON array body — asserting 400, a field-specific entry in `issues[]`, and **no premium figure anywhere in the response** (SC-007)

### Implementation for User Story 4

- [ ] T055 [US4] Implement Zod-issue → `ValidationErrorResponse` translation in `backend/src/api/error-mapping.ts`, producing one `{ field, message }` entry per offending field with messages safe to display
- [ ] T056 [US4] Return 400 with the mapped `issues[]` from `backend/src/handler.ts` for every parse or validation failure, confirming the handler still never throws (depends on T055)
- [ ] T057 [US4] Add client-side validators to `frontend/src/app/quote-form/` mirroring the Zod rules for responsiveness, and surface server-returned `issues[]` against the named fields so a server-only rule still yields a field-specific message
- [ ] T058 [US4] Handle network failure and 5xx in `frontend/src/app/quote-form/`: set a friendly `errorMessage`, clear `loading`, clear any stale `quoteResult`, and allow retry without a page reload (FR-018)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T059 [P] Write `README.md` at the repository root: both services running in five commands or fewer, and the `risk-kb.json` location and how to edit it (FR-019, FR-021, SC-009) — derive from `quickstart.md`
- [ ] T060 [P] Write `SOLUTION.md` at the repository root — **maximum 300 words**: architecture decisions, KB schema design choices, agent skill rationale, and one thing you would improve with more time
- [ ] T061 [P] Refine hand-authored CSS across `frontend/src/` for responsive desktop and mobile layouts, with form labels and error associations for accessibility — no UI component library
- [ ] T062 Audit `backend/src/` and `frontend/src/` for constitution compliance: zero `any`, zero scoring constants, zero band boundaries, zero factor identifiers, and no `switch`/`if` chain branching per factor or per operator
- [ ] T063 Run `npm --prefix backend test` and confirm the whole suite is green, including one asserting case per risk band
- [ ] T064 Execute `quickstart.md` end to end on a clean checkout, including the flood-zone factor demonstration, and confirm `git diff` shows `risk-kb.json` only
- [ ] T065 Verify `AGENT_LOG.md` has an entry per logical change with the summary table rows added, prompts quoted verbatim, and rejected output recorded (Principle VI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational. Consumes the scoring output produced in US1, so in practice follows US1
- **User Story 3 (Phase 5)**: Depends on Foundational. Extends the US1 evaluator and schema; its KB-only claim is observable only once US1 and US2 exist, which is why the spec ranks it P3
- **User Story 4 (Phase 6)**: Depends on Foundational. Genuinely independent of US2 and US3 — it only needs the US1 request schema
- **Polish (Phase 7)**: Depends on all desired stories being complete

### Honest note on story independence

US2 and US3 are *independently testable* but not *independently buildable* — both
extend modules first created in US1 (`condition-evaluator.ts`, `scoring.ts`,
`handler.ts`). This is inherent to the feature: a premium cannot exist without a
score, and a score cannot be explained before it is computed. US4 is the only
story that could genuinely be built in parallel with US2/US3 by a second person.

### Within Each User Story

- Tests are written first and must fail before implementation
- Lookup tables (`operators`, `combinators`) before the evaluator that dispatches through them
- Evaluator before scoring; scoring before band resolution; band resolution before premium; premium before summary composition
- Backend endpoint behaviour before the frontend that consumes it

### Parallel Opportunities

- Phase 1: T002–T007 all parallel after T001
- Phase 2: T009, T010 parallel; T014, T015, T016 parallel after T013
- Phase 3: all five tests (T017–T021) parallel; then T022, T023, T024 parallel
- Phase 4: T033, T034 parallel; T037, T038 parallel
- Phase 5: all five tests (T040–T044) parallel; T051 parallel with T045–T050
- Phase 7: T059, T060, T061 parallel

---

## Parallel Example: User Story 1

```bash
# Launch all User Story 1 tests together (they must fail first):
Task: "Unit tests for roundToPence in backend/tests/unit/money.test.ts"
Task: "Unit tests for leaf operators in backend/tests/unit/operators.test.ts"
Task: "Unit tests for band resolution in backend/tests/unit/band-resolver.test.ts"
Task: "Unit tests for premium calculator in backend/tests/unit/premium-calculator.test.ts"
Task: "Contract tests for three band cases in backend/tests/contract/handler-bands.test.ts"

# Then launch the independent leaf modules together:
Task: "Zod QuoteRequest schema in backend/src/api/request-schema.ts"
Task: "roundToPence in backend/src/engine/money.ts"
Task: "LEAF_OPERATORS lookup table in backend/src/engine/operators.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T007)
2. Phase 2: Foundational (T008–T016) — **blocks everything**
3. Phase 3: User Story 1 (T017–T032)
4. **STOP and VALIDATE**: submit a valid profile, confirm a premium is displayed
5. Demo-ready: a working quoting tool

### Incremental Delivery

1. Setup + Foundational → skeleton runs, fails loudly on a bad KB
2. + US1 → **MVP**: premiums calculated and displayed
3. + US2 → quotes become explainable (badge, summary, factors, breakdown)
4. + US3 → configurability enforced: compound conditions, per-occurrence, validation, version gate
5. + US4 → bad input is rejected specifically and errors are recoverable
6. + Polish → README, SOLUTION.md, compliance audit, quickstart validation

### Recommended scope for the review

Phases 1–5 (through US3) constitute the graded core: the KB design and
configurability carry 25 of 100 points and the live demo requires adding a KB
factor. US4 and Polish are what make it a finished deliverable rather than a
demo, and Phase 7's `README.md`, `SOLUTION.md` and `AGENT_LOG.md` tasks are
explicit deliverables in the brief.

---

## Notes

- `[P]` means different files with no dependency on incomplete work
- `[Story]` labels map tasks to spec.md user stories for traceability
- Commit after each task or logical group — and append the matching
  `AGENT_LOG.md` entry in that same commit (Principle VI)
- Verify tests fail before implementing
- Stop at any checkpoint to validate a story independently
- If a task appears to require a hardcoded scoring value, band boundary, or
  factor id, the task is wrong — the value belongs in `risk-kb.json`
