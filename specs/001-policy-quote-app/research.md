# Phase 0 Research: PolicyQuote

**Feature**: `001-policy-quote-app` | **Date**: 2026-08-28
**Input**: [spec.md](./spec.md), [constitution](../../.specify/memory/constitution.md)

The specification carries no unresolved `NEEDS CLARIFICATION` markers (five
clarifications were closed in the 2026-08-28 session). This document therefore
covers technology selection and the design questions that the specification
deliberately leaves to implementation.

---

## R1. Runtime and language baseline

**Decision**: Node.js 22 LTS, TypeScript 5.6+ in `strict` mode with
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.

**Rationale**: Node 22.22.3 is the installed local runtime and is an active LTS
line, so the same toolchain serves local dev, Jest, and a future Lambda
`nodejs22.x` target with no version negotiation. `strict` alone does not
eliminate the `any`-adjacent holes that Principle IV targets;
`noUncheckedIndexedAccess` is what forces narrowing when indexing into
KB-derived collections, which is exactly the untrusted-structured-data boundary
the constitution is worried about.

**Alternatives considered**: Node 20 LTS — supported but older than the
installed runtime, adding a needless mismatch. Plain JavaScript with JSDoc —
rejected outright; Principle IV requires a typed KB schema.

---

## R2. Angular version

**Decision**: Angular **20.3.x**, standalone components, `provideZonelessChangeDetection()`.

**Rationale**: The constitution requires Angular 17+ with Signals-only local
state. Angular 20.3 has `signal()`, `computed()`, `effect()`, signal-based
`input()`/`output()`, and zoneless change detection all stable, which is the
combination that lets us honour Principle II without experimental APIs. Zoneless
is the honest expression of "Signals only" — with Zone.js present, a
`BehaviorSubject` would still work and the constraint becomes an unenforced
convention rather than an architectural property.

Angular 22 (current latest) declares `engines.node: ^22.22.3 || ^24.15.0`. The
installed runtime is exactly 22.22.3 — the bottom edge of that range. Any
patch-level drift downwards on a reviewer's machine breaks `npm install`.
Angular 20.3.x declares `^20.19.0 || ^22.12.0 || >=24.0.0`, which leaves real
headroom and directly protects SC-009 (a new developer gets running in ≤5
commands).

**Alternatives considered**: Angular 22.1.4 — newest, but the engine range is
too tight against the target machine for a deliverable whose success criterion
is frictionless startup. Angular 17 — the stated floor, but signal `input()`
was not stable until 17.3 and zoneless did not exist, so `RiskBandBadgeComponent`
would need the decorator-based `@Input()`.

---

## R3. Backend HTTP transport

**Decision**: Node's built-in `node:http` module as a ~50-line adapter that
translates a request into an API-Gateway-shaped event, calls
`handler(event, context)`, and writes the returned status/headers/body. No
Express, no Fastify.

**Rationale**: Principle III states HTTP wiring MUST be a thin adapter over the
handler, "never the other way round". A zero-dependency adapter makes that
structurally obvious rather than merely asserted: there is no framework that
could tempt routing, validation, or error handling to migrate out of the
handler. It also keeps the dependency surface honest for Principle V's
self-containment claim.

**Alternatives considered**: Express — familiar, but it invites
`app.post('/policy/quote', ...)` to become the real entry point with the Lambda
handler demoted to a wrapper, inverting the required dependency direction.
`aws-lambda-ric` / SAM local — accurate emulation, but violates the ≤5-command
startup constraint (FR-019).

---

## R4. Cross-origin strategy

**Decision**: No CORS headers. The Angular dev server proxies `/policy/quote`
to the backend via `proxy.conf.json`.

**Rationale**: Same-origin from the browser's perspective means no preflight, no
CORS configuration to get wrong, and no security-relevant header logic in the
handler. It also keeps the frontend's API base URL as a relative path, so
nothing environment-specific is compiled into the bundle.

**Alternatives considered**: Permissive `Access-Control-Allow-Origin: *` in the
adapter — fewer moving parts in the frontend config, but bakes a production-
hostile default into the deliverable and adds transport concerns to the handler.

---

## R5. Validation library and the single-schema principle

**Decision**: Zod 4.x, used for **both** the quote request and the Knowledge
Base. All TypeScript types are derived with `z.infer<>`; no hand-written
interface duplicates a schema.

**Rationale**: The constitution mandates Zod for request input (Principle III)
and separately requires the KB to be "described by explicit TypeScript types"
and "validated against that schema at load time" (Principle IV). Using one
library for both means the type and the validator cannot drift, because the type
*is* the validator's output. A hand-written `interface RiskKnowledgeBase`
alongside a separate runtime check is two sources of truth and precisely the
drift risk Principle IV exists to close.

**Rejected sub-option**: Zod's `z.any()` / `z.unknown()` passthrough for the
recursive condition node. The recursive condition type is expressed with an
explicit type annotation plus `z.lazy()`, keeping the union closed. An open
passthrough would let an unknown operator reach the evaluator, violating FR-012.

**Alternatives considered**: Zod for requests + JSON Schema (Ajv) for the KB —
two schema languages, two failure-message formats, and a manual TS type for the
KB. `io-ts` / `valibot` — viable, but Zod is named in the brief and the
constitution.

---

## R6. Condition evaluator architecture (Principle I core)

**Decision**: Two frozen lookup tables and one recursive function.

- `LEAF_OPERATORS: Record<LeafOperator, (fieldValue, condition) => boolean>`
- `GROUP_COMBINATORS: Record<GroupOperator, (results: boolean[]) => boolean>`
- `evaluateCondition(condition, request)` dispatches on the presence of a group
  key, recurses into children, and otherwise looks the leaf operator up in the
  table.

**Rationale**: The constitution bans `if`/`else` and `switch` chains that branch
per factor *and* requires the operator evaluator to "dispatch on operators via a
data-driven lookup, not a per-factor branch". A record keyed by operator name
satisfies this literally, and adding an operator becomes a one-entry table
addition plus a schema enum addition — a new *capability*, which
Development-Workflow gate 3 explicitly permits, as distinct from a new *rule*.

Recursion through the same entry point satisfies FR-010b: a leaf and a
five-deep nested group take the identical code path, so structural complexity in
the KB never implies an engine change.

**Alternatives considered**: `switch (condition.operator)` — the most common
shape and explicitly prohibited. A visitor/class hierarchy per operator — same
data-driven property, but ceremony that obscures a five-operator table. A
mini-expression-language string (`"age < 25 || age > 75"`) — far more
expressive, but needs a parser, is unvalidatable at load time in any useful
sense, and turns the KB into code, which defeats the point of externalising it.

---

## R7. Risk band representation

**Decision**: An **ordered array** of band objects, each with `id`, `label`,
`min`, `max`, `riskMultiplier`, and `summaryTemplate` — not the object map shown
in the brief's example.

**Rationale**: The brief permits extension ("you may extend this"). An array
gives three properties the map cannot:

1. **Deterministic ordering.** Band resolution and "which is the highest band"
   need a defined order. JS object key order is insertion-ordered for string
   keys but is a fragile thing to hang pricing on, and it is lost through some
   serialisation paths.
2. **Clamping to the top band** (a named edge case) becomes "the last band" or
   "the band with the greatest `max`", expressible without knowing any band's
   name — so no band identifier is hardcoded, per Principle I.
3. **Adding a band** is a KB-only array append, which FR-014a explicitly
   anticipates ("introducing a new band remains a rules-knowledge-base-only
   change").

Load-time validation additionally asserts bands are contiguous and
non-overlapping, closing the "gaps between bands" edge case.

**Alternatives considered**: The literal example map — matches the brief
verbatim, but makes band order implicit and "highest band" undiscoverable
without a hardcoded name. A single sorted threshold list — compact, but has no
natural home for per-band `riskMultiplier` and `summaryTemplate`.

---

## R8. Monetary rounding

**Decision**: A `roundToPence(value)` helper using epsilon-corrected half-up
rounding, applied at exactly two points: the annual premium, then the derived
monthly premium. Currency is carried as a `number` of pounds.

**Rationale**: FR-004a/FR-004b fix both the order of operations and the number
of rounding points. The naive `Math.round(v * 100) / 100` misrounds
representative values — `1.005` is stored as `1.00499999...` and rounds *down*,
which for a premium is a visible, arguable defect. Correcting with a small
epsilon before rounding makes the half-up behaviour match what a human doing
the arithmetic expects, and keeps output byte-identical across runs as
Principle V requires.

Monthly is derived from the **rounded** annual. Note that half-up rounding of
`annual ÷ 12` does **not** by itself satisfy FR-004a: an annual premium of
`360.10` gives `30.008…`, which rounds up to `30.01` and yields
`30.01 × 12 = 360.12`, exceeding the annual figure. FR-004a states the
non-exceedance property as a MUST, so the monthly figure uses **directed
rounding down** to the pence (`floorToPence`), while the annual figure uses
half-up (`roundToPence`). Both are still "rounded to two decimal places" as
FR-004a requires; the direction is what the invariant fixes. The customer is at
most 11p a year better off, and never worse off, than the exact twelfth.

**Alternatives considered**: Integer pence throughout — the textbook answer and
genuinely more robust, but the KB authors write `basePremium: 300` and
`coverageLoadFactor: 1.2` in pounds, so the boundary conversion adds surface
area for a two-factor product with no accumulation loop. `decimal.js` /
`big.js` — correct, but a dependency to eliminate one rounding call in a
calculation with exactly two multiplications.

---

## R9. KB version gate

**Decision**: The KB carries a semver `version`. The service declares a
supported **range** as a constant and checks it with the `semver` package's
`satisfies()` at load time, exiting non-zero with a message naming the version
found and the range expected.

**Rationale**: FR-013a/FR-013b require a declared supported range, verification
at startup, refusal to start when outside it, and no silent coercion. Semver's
range grammar (`>=1.0.0 <2.0.0`) already expresses "any additive change, no
breaking change", which is the exact policy wanted: adding a factor bumps
PATCH/MINOR and keeps working; a schema-breaking change bumps MAJOR and stops
the service loudly. Hand-rolling range comparison is a well-known source of
off-by-one bugs for a solved problem.

This failure is raised as a **distinct error type** from malformed-KB, because
the spec calls them out as separate edge cases with different messages: a
version-range failure means the file is structurally valid but semantically
unsupported.

**Alternatives considered**: A plain integer `schemaVersion` with equality —
simpler, but cannot express "compatible with a range", forcing a code change for
every additive KB revision. No gate at all (the brief's baseline) — rejected by
FR-013b.

---

## R10. Risk summary composition

**Decision**: Per-band `summaryTemplate` strings in the KB using `{{placeholder}}`
tokens, substituted from a fixed, engine-published placeholder set, with applied
factor descriptions appended. Any placeholder not in the published set is a
**load-time** validation error.

**Rationale**: FR-014a forbids customer-facing risk prose in product logic;
FR-014b requires an unresolvable placeholder to be a validation failure rather
than a partial substitution. Validating templates when the KB loads — rather
than when a quote is requested — means a typo in a template is caught at startup
by the operator who made it, not intermittently in production by whichever
customer first lands in that band. This is the same fail-loudly posture the spec
takes for malformed rules.

Substitution is a single regex replace over the token set; the engine never
concatenates prose of its own.

**Alternatives considered**: Handlebars/Mustache — a real template engine for
five scalar substitutions, and its lenient default (unknown token → empty
string) is the exact behaviour FR-014b prohibits. Prose assembled in code from
KB fragments — violates FR-014a.

---

## R11. Test strategy

**Decision**: Jest 30 with `ts-jest`. Tests derive expected values **from the
KB** rather than restating literals. Layered as: operator/combinator unit tests,
evaluator recursion tests, KB-validation failure tests, band/premium tests
(one per band, satisfying SC-006), and handler-level contract tests.

**Rationale**: Principle VII requires all three bands covered and — importantly
— that tests "assert against values derived from the KB rather than duplicating
magic numbers, so that a KB change surfaces as a deliberate test update and not
a silent drift". A test hardcoding `expect(annual).toBe(360)` passes for the
wrong reason after a `basePremium` edit; a test computing the expectation from
the loaded KB fails only when the *engine* is wrong. Tests use a small fixture
KB for engine behaviour and the real `risk-kb.json` for the band cases, so the
shipped rules are themselves exercised.

**Alternatives considered**: `node:test` — zero-dependency and adequate, but the
brief and constitution both name Jest. `@swc/jest` — faster, but adds a
toolchain for a suite this size.

---

## R12. Repository layout

**Decision**: A two-package repository — `backend/` and `frontend/` — with
`risk-kb.json` at the **repository root**.

**Rationale**: The brief requires the KB "committed to the repo as a first-class
artifact, not buried in source folders", and the constitution echoes this ("a
documented, non-buried path"). Root placement makes a rule change visible as a
top-level diff, which is what SC-004's "verified by inspecting the diff" asks
for. Two independent packages keep the two `npm start` commands (FR-019) simple
and avoid a workspace tool whose install semantics a reviewer would have to
learn.

**Alternatives considered**: npm workspaces / Nx monorepo — better dependency
hoisting, but adds a root install layer and tooling concepts that work against
the ≤5-command criterion. KB inside `backend/src/` — directly contradicts the
"not buried" requirement.

---

## Resolved unknowns summary

| # | Question | Resolution |
|---|----------|------------|
| R1 | Runtime/language | Node 22 LTS, TS 5.6+ strict + `noUncheckedIndexedAccess` |
| R2 | Angular version | 20.3.x, standalone, zoneless |
| R3 | HTTP transport | `node:http` thin adapter over `handler()` |
| R4 | CORS | Avoided via Angular dev-server proxy |
| R5 | Validation | Zod 4.x for request *and* KB; types via `z.infer` |
| R6 | Evaluator | Frozen operator/combinator lookup tables + recursion |
| R7 | Bands | Ordered array with `riskMultiplier` + `summaryTemplate` |
| R8 | Rounding | Epsilon-corrected half-up at exactly two points |
| R9 | Version gate | semver range, checked at load, fails startup |
| R10 | Summary | KB templates, `{{token}}`, validated at load |
| R11 | Tests | Jest 30 + ts-jest, expectations derived from KB |
| R12 | Layout | `backend/` + `frontend/`, `risk-kb.json` at root |

## Out of scope for this plan

The brief's Dockerfile / `GET /health` bonus is not represented in any
functional requirement of `spec.md` and is therefore excluded. The agent-skill
bonus is already satisfied by the committed `AGENTS.md`, `CLAUDE.md`, and
`.github/copilot-instructions.md`. KB versioning and compound conditions are
*not* treated as bonuses here — they are binding requirements (FR-013, FR-010a).
