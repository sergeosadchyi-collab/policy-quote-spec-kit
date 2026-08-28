# Implementation Plan: PolicyQuote — Home Insurance Quoting Tool

**Branch**: `001-policy-quote-app` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-policy-quote-app/spec.md`

## Summary

A single-page home insurance quoting tool: a customer enters personal and
property details and immediately receives a premium estimate with an
explainable risk assessment — risk band, plain-English summary, pricing
breakdown, and the specific factors that were applied.

The defining architectural requirement is that **all scoring rules live outside
the code**. A Knowledge Base file (`risk-kb.json`, at the repository root) holds
the base premium, coverage load factor, risk bands with their multipliers and
summary wording, and the factor list. The engine is table-driven: it loads and
validates the KB at startup, iterates the factors, evaluates each condition
through a recursive generic evaluator dispatching on frozen operator lookup
tables, accumulates points, resolves a band positionally, and computes
`basePremium × riskMultiplier × coverageLoadFactor`. Adding, retuning, or
retiring a factor, moving a band boundary, or rewording an explanation is a
KB-only diff.

Delivered as two independent npm packages: an Angular 20 standalone, zoneless,
Signals-only frontend, and a Node.js/TypeScript backend whose core unit is a
Lambda-compatible `handler(event, context)` with a ~50-line `node:http` adapter
over it. Zod validates both the request and the KB, with all TypeScript types
derived from those schemas.

## Technical Context

**Language/Version**: TypeScript 5.6+ on Node.js 22 LTS (22.22.3 local).
`strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` —
`strict` alone does not force narrowing at the KB boundary, which is exactly
where untrusted structured data enters.

**Primary Dependencies**:

- Backend — `zod` 4.x (request **and** KB schemas), `semver` (KB version-range
  gate), `jest` 30 + `ts-jest`, `typescript`. HTTP served by built-in
  `node:http`; no Express/Fastify.
- Frontend — `@angular/core` 20.3.x, `@angular/forms` (reactive forms),
  `@angular/common/http`. **No UI component library** (Principle V).

**Storage**: None. Quotes are calculated and returned in the moment; no
persistence, no accounts (spec Assumptions). The only persistent artifact is the
KB file, read from local disk at startup.

**Testing**: Jest 30 + `ts-jest`. Layers: leaf operators, group combinators,
recursive evaluator, KB validation failure modes, band resolution and premium
(one asserting case per band — SC-006, Principle VII), and handler-level
contract tests invoking `handler()` directly with constructed events. Expected
values are **derived from the loaded KB**, never restated as literals.

**Target Platform**: Backend — Node 22, portable between a local `node:http`
process and AWS Lambda `nodejs22.x` with no rewrite. Frontend — modern desktop
and mobile browsers; no native app, no legacy browser obligation.

**Project Type**: Web application — two packages (`backend/`, `frontend/`) plus
a root-level KB artifact.

**Performance Goals**: Quote returned within 2 seconds of submission (SC-002);
in practice sub-millisecond, since scoring is an in-memory pass over a small
factor array with no I/O after startup. Form-to-premium in under 60 seconds of
human time, with no documentation or account (SC-001).

**Constraints**:

- Deterministic and self-contained — no LLM, no external API, no clock, no
  randomness in the pipeline (FR-020, SC-008, Principle V).
- Zero scoring values, band boundaries, or factor identifiers in application
  code; no per-factor `if`/`switch` chains (Principle I).
- Angular Signals only for local UI state; no `BehaviorSubject`/`Subject`;
  standalone components, no NgModules (Principle II).
- No `any`, anywhere (Principle IV).
- Rounding at exactly two points: annual, then monthly derived from the rounded
  annual (FR-004a/b).
- Both services up in ≤5 commands, each starting with one `npm start`
  (FR-019, SC-009).
- Every significant agent interaction logged in `AGENT_LOG.md` in the same
  change (Principle VI).

**Scale/Scope**: Single line of business (home), single currency (GBP), single
locale (UK). 4 user stories, 30 functional requirements, one HTTP endpoint,
~12 backend modules, ~5 frontend components. Anonymous public traffic; no
concurrency or throughput target beyond the 2-second perceived latency.

### Planning decisions taken here

**`startsWith` ships as a v1 leaf operator.** FR-010 names five operators as a
floor (`eq`, `gt`, `gte`, `between`, `outside range`), and adding operators is
permitted. The spec's Assumptions state that postcode is captured precisely
because "geography-based factors — such as flood-zone prefixes — are an
anticipated future rules addition, **which the rules knowledge base must
accommodate without product changes**". Honouring that assumption means the
prefix capability must exist before the rule does; otherwise the first geography
factor forces an engine change and the promise fails at the exact moment it is
tested. Cost is one entry in the operator table, one schema enum member, and one
unit test.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` v1.0.0.

| # | Gate (source) | Status | How the design satisfies it |
|---|---------------|--------|------------------------------|
| I | KB-driven scoring; table-driven engine; no hardcoded values or per-factor branches | **PASS** | `risk-kb.json` at repo root; `LEAF_OPERATORS` / `GROUP_COMBINATORS` frozen lookup records (research R6); band resolution is positional, so no band `id` appears in code (research R7, data-model §3); every operand of the premium formula is KB-sourced |
| II | Signals-only frontend state; standalone components; no NgModules | **PASS** | Angular 20.3 standalone + `provideZonelessChangeDetection()`; `loading`/`quoteResult`/`errorMessage` as `signal`, `canSubmit`/`hasResult` as `computed`; RxJS confined to `HttpClient` and converted to signals at the boundary (contracts/frontend-components §2–3) |
| III | `handler(event, context)` export; HTTP is a thin adapter; Zod on all input; structured errors; required response fields incl. KB version | **PASS** | `node:http` adapter performs event translation only and has no error branch of its own (contracts/lambda-handler §1–2); handler never throws; response carries all seven required fields plus `kbVersion` |
| IV | No `any`; KB schema typed and validated at load; separated, independently testable modules | **PASS** | All types via `z.infer<>` — the type *is* the validator's output, so the two cannot drift (research R5); `unknown` at the parse boundary; module boundary table in contracts/lambda-handler §5 |
| V | Deterministic; no LLM/network; local KB file; no external UI libraries | **PASS** | No I/O in the pipeline after startup; hand-authored CSS only; `node:http`, `zod` and `semver` are the entire backend runtime surface |
| VI | Every significant agent interaction logged in `AGENT_LOG.md`, in the same change | **PASS** | Enforced per task during `/speckit-implement`; `AGENTS.md` carries the entry template and the pre-turn self-check |
| VII | Jest covers all three bands; expectations derived from the KB; new operators ship with evaluator tests | **PASS** | Test layering in research R11; `startsWith` ships with its own unit test per the decision above |

**Technology Constraints check**

| Constraint | Status | Note |
|-----------|--------|------|
| Angular 17+, standalone, Signals, `HttpClient` for transport only | **PASS** | Angular 20.3.x (research R2) |
| `RiskBandBadgeComponent` accepting a `riskBand` input | **PASS** | Specified in contracts/frontend-components §1 |
| UI displays `appliedFactors` using KB labels, no local copies | **PASS** | Verbatim rendering; frontend id→text maps explicitly prohibited (§4) |
| Node + TS, Zod, Jest, single `POST /policy/quote` | **PASS** | contracts/policy-quote.openapi.yaml |
| KB with `version`, `basePremium`, `coverageLoadFactor`, `riskBands` (with `riskMultiplier`), `factors` | **PASS** | contracts/risk-kb.schema.json |
| Premium formula with every operand KB-sourced | **PASS** | data-model §9 |
| One `npm start` per service; ≤5 commands total | **PASS** | quickstart.md — 5 commands including opening the browser |
| README documents KB location; `SOLUTION.md` ≤300 words | **DEFERRED** | Both are implementation tasks; quickstart.md is the README's source material |

**Development Workflow gates** — no `any`, no scoring constants in application
code, green Jest including all three bands, `AGENT_LOG.md` updated — all
satisfied by design and verified per task at implementation time.

**Result: PASS — no violations. Complexity Tracking is empty.**

### Post-Phase-1 re-evaluation

Re-checked after `research.md`, `data-model.md`, `contracts/` and
`quickstart.md` were produced. No gate moved to violation. Three points where
the design deliberately went **beyond** the minimum, recorded here rather than
left implicit:

1. **Bands as an ordered array, not the brief's object map** (research R7). The
   brief permits extension. The array is what makes "clamp to the highest band"
   expressible without naming a band; the map version tempts
   `bands['HIGH_RISK']`, which would breach Principle I.
2. **The KB validated by Zod rather than a hand-written interface plus a
   separate check** (research R5). Principle IV asks for both a type and
   load-time validation; deriving one from the other removes the drift the
   principle exists to guard against.
3. **`startsWith` as a v1 operator** (see decision above). A capability
   addition, permitted by Development-Workflow gate 3 — not a rule in code.

None requires a Complexity Tracking entry: each reduces coupling rather than
adding a project, layer, or abstraction.

## Project Structure

### Documentation (this feature)

```text
specs/001-policy-quote-app/
├── plan.md                          # This file
├── spec.md                          # Feature specification (clarified)
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/                       # Phase 1 output
│   ├── policy-quote.openapi.yaml    # HTTP contract for POST /policy/quote
│   ├── risk-kb.schema.json          # KB file format contract
│   ├── lambda-handler.md            # Handler, adapter and KB-loading contract
│   └── frontend-components.md       # Component & Signals state contract
├── checklists/
│   └── requirements.md              # Spec quality checklist (passed)
└── tasks.md                         # Phase 2 output — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
risk-kb.json                         # ⭐ THE KNOWLEDGE BASE — first-class root artifact
README.md                            # ≤5-command startup; documents KB location
SOLUTION.md                          # ≤300 words
AGENT_LOG.md                         # Chronological agent interaction log
AGENTS.md / CLAUDE.md                # Agent instructions (already present)

backend/
├── package.json                     # "start" → node:http server
├── tsconfig.json                    # strict + noUncheckedIndexedAccess
├── jest.config.js
├── src/
│   ├── handler.ts                   # export handler(event, context)
│   ├── server.ts                    # thin node:http adapter over handler
│   ├── kb/
│   │   ├── kb-schema.ts             # Zod KB schema; types via z.infer
│   │   ├── kb-loader.ts             # read → parse → validate → version-gate
│   │   ├── kb-cross-validation.ts   # band contiguity, placeholders, unique ids
│   │   ├── supported-versions.ts    # SUPPORTED_KB_VERSION_RANGE constant
│   │   └── kb-errors.ts             # NotFound / Malformed / UnsupportedVersion
│   ├── engine/
│   │   ├── operators.ts             # LEAF_OPERATORS lookup table
│   │   ├── combinators.ts           # GROUP_COMBINATORS (all / any / not)
│   │   ├── condition-evaluator.ts   # recursive generic dispatch
│   │   ├── scoring.ts               # iterate factors → AppliedFactor[] + score
│   │   ├── band-resolver.ts         # score → band, positional clamp
│   │   ├── premium-calculator.ts    # formula + the two rounding points
│   │   ├── summary-composer.ts      # KB template substitution
│   │   └── money.ts                 # roundToPence
│   ├── api/
│   │   ├── request-schema.ts        # Zod QuoteRequest (+ normalisation)
│   │   ├── response-types.ts        # QuoteResult and error shapes
│   │   └── error-mapping.ts         # Zod issues → ValidationErrorResponse
│   └── types/
│       └── lambda.ts                # QuoteApiEvent / Context / Response
└── tests/
    ├── unit/                        # operators, combinators, evaluator, money,
    │                                #   band-resolver, premium, summary
    ├── kb/                          # each validation failure mode
    └── contract/                    # handler() invoked directly; 3 band cases

frontend/
├── package.json                     # "start" → ng serve
├── angular.json
├── proxy.conf.json                  # /policy/quote → localhost:3000
└── src/
    ├── main.ts                      # bootstrapApplication + zoneless
    └── app/
        ├── app.ts                   # root standalone component
        ├── quote-form/              # reactive form, signal state
        ├── quote-result/            # premium, summary, coverage breakdown
        ├── applied-factors/         # renders KB descriptions verbatim
        ├── risk-band-badge/         # ⭐ RiskBandBadgeComponent (required)
        ├── services/
        │   └── quote-api.ts         # HttpClient → POST /policy/quote
        └── models/
            └── quote.ts             # types mirroring the API contract
```

**Structure Decision**: Two independent npm packages (`backend/`, `frontend/`)
with **`risk-kb.json` at the repository root** — not in a workspace, and not
inside `backend/src/`.

Root placement is a requirement rather than a preference: the brief demands the
KB be "a first-class artifact, not buried in source folders", and SC-004 is
verified "by inspecting the diff". A rules change must read as a top-level,
reviewable diff that a pricing specialist — not an engineer — can assess.

Independent packages (rather than npm workspaces or Nx) keep the two `npm start`
commands literal and avoid a root install layer, protecting the ≤5-command
criterion. The cost — dependencies installed twice — is irrelevant at this
scale.

The backend module split mirrors Principle IV's separation-of-concerns
requirement one-to-one; the boundary table in
[contracts/lambda-handler.md §5](./contracts/lambda-handler.md) states what each
unit must *not* know, which is the enforceable half of that rule.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations.** The Constitution Check passes on all seven principles, all
technology constraints, and all development-workflow gates, both before Phase 0
and after Phase 1. No deviation requires justification, so this table is
intentionally empty.
