<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Rationale: Principle II materially expanded with a template-location rule
(external `templateUrl`/`styleUrl` mandatory, inline `template:`/`styles:`
prohibited). No principle removed or redefined incompatibly, so MINOR.

Principles modified:
  - II. Signals-Only Frontend State — added external-template requirement

Sections modified:
  - Technology Constraints — frontend bullet now names `templateUrl`
  - Development Workflow & Quality Gates — new gate 2 bullet on inline templates

Templates requiring updates:
  ✅ specs/001-policy-quote-app/contracts/frontend-components.md — updated with
     the template-file requirement and the per-component `.html` file list.
  ✅ specs/001-policy-quote-app/plan.md — frontend source tree updated with the
     component `.html` files.
  ✅ .specify/templates/plan-template.md — generic Constitution Check gate; no
     edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific sections
     affected; no edit needed.
  ✅ .specify/templates/tasks-template.md — covered by generic categories.
  ✅ AGENTS.md / CLAUDE.md — logging protocol unaffected.

Deferred TODOs: none

---
PREVIOUS REPORT
==================
Version change: (template, unversioned) → 1.0.0
Rationale: Initial ratification. The file previously contained only unfilled
placeholder tokens; this is the first concrete constitution, so MAJOR = 1.

Principles defined (all new — no prior titles to map):
  - I. Knowledge-Base-Driven Scoring (NON-NEGOTIABLE)
  - II. Signals-Only Frontend State
  - III. Lambda-Compatible Backend Contract
  - IV. Strict TypeScript, No Escape Hatches
  - V. Deterministic & Self-Contained
  - VI. Agent Interaction Transparency (NON-NEGOTIABLE)
  - VII. Test Coverage of Risk Bands

Added sections:
  - Core Principles (7 principles)
  - Technology Constraints
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none (template placeholders replaced in place)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate is
     generic ("Gates determined based on constitution file"); no edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific mandatory
     sections added or removed; no edit needed.
  ✅ .specify/templates/tasks-template.md — principle-driven task types
     (KB config, tests, docs) already covered by generic categories.
  ✅ CLAUDE.md — Agent Logging Protocol aligns with Principle VI.
  ⚠ README.md — does not exist yet. Must document the KB file location and
     the ≤5-command startup required by Technology Constraints.

Deferred TODOs: none
-->

# PolicyQuote Constitution

## Core Principles

### I. Knowledge-Base-Driven Scoring (NON-NEGOTIABLE)

All risk scoring rules MUST live in an external Knowledge Base config file
committed as a first-class repository artifact (e.g. `risk-kb.json` at a
documented, non-buried path). The scoring engine MUST be table-driven: it loads
the KB, iterates `factors`, evaluates each condition generically, accumulates
points, and derives the risk band from KB-defined thresholds.

The following MUST require a KB edit only, with zero changes to engine code:
adding a factor, removing a factor, changing a factor's points, changing band
boundaries, changing `basePremium`, `coverageLoadFactor`, or `riskMultiplier`.

Prohibited in application code: hardcoded point values, hardcoded band
boundaries, hardcoded factor identifiers, and `if`/`else` or `switch` chains
that branch per factor. The condition evaluator MUST dispatch on operators via a
data-driven lookup, not a per-factor branch.

*Rationale*: Configurability is the central requirement of this project.
Rules change far more often than engines; coupling them guarantees redeployment
for every actuarial tweak.

### II. Signals-Only Frontend State

Local Angular UI state MUST use Angular Signals — `signal()`, `computed()`, and
`effect()`. `BehaviorSubject` and `Subject` are PROHIBITED for local UI state.
RxJS is permitted only where it is the framework-native interface, specifically
`HttpClient` request streams, which MUST be converted into signals at the
boundary.

Components MUST be Angular 17+ standalone components. NgModules are PROHIBITED.
Derived view state MUST use `computed()` rather than manual recomputation.

Component templates MUST live in a separate `.html` file referenced via
`templateUrl`. Inline `template:` strings are PROHIBITED, including single-line
templates. Styles MUST likewise use `styleUrl`/`styleUrls`, not inline
`styles:`. Each template file MUST sit beside its component file and share its
base name (e.g. `quote-form.ts` → `quote-form.html`).

*Rationale*: A single, consistent reactivity model removes dual-source-of-truth
bugs and makes change propagation auditable. External templates keep markup
diffable, lintable and formattable by standard tooling, and stop the
presentation layer from being buried inside decorator metadata as components
grow.

### III. Lambda-Compatible Backend Contract

The backend MUST export a `handler(event, context)` function conforming to the
AWS Lambda invocation signature. HTTP framework wiring, if any, MUST be a thin
adapter over that handler — never the other way round.

All request input MUST be validated with Zod before reaching the scoring engine.
Invalid input MUST produce a structured error response, never a thrown
unhandled exception. The success response MUST include `monthlyPremium`,
`annualPremium`, `riskBand`, `riskScore`, `riskSummary`, `coverageDetails`, and
`appliedFactors`, and MUST surface the active KB `version`.

*Rationale*: Keeping the handler as the core unit preserves portability between
Lambda and container hosting without a rewrite.

### IV. Strict TypeScript, No Escape Hatches

The `any` type is PROHIBITED across frontend and backend. Use `unknown` plus
narrowing at trust boundaries. The KB schema MUST be described by explicit
TypeScript interfaces or types, and the runtime-parsed KB MUST be validated
against that schema at load time.

Modules MUST maintain separation of concerns: KB loading, condition evaluation,
premium calculation, and transport/handler wiring MUST be separate units, each
independently unit-testable.

*Rationale*: The KB is untrusted structured data; typing it is what makes
"add a factor without code changes" safe rather than merely possible.

### V. Deterministic & Self-Contained

The backend MUST NOT call any LLM or external network API. The KB MUST be read
as a local file, never fetched from a remote service. Given identical input and
an identical KB, the engine MUST return byte-identical output.

No external UI component libraries (Material, PrimeNG, Bootstrap or equivalent)
may be added; styling MUST be hand-authored CSS.

*Rationale*: Determinism makes quotes reproducible and auditable, which is a
baseline expectation for anything resembling an insurance calculation.

### VI. Agent Interaction Transparency (NON-NEGOTIABLE)

Every significant AI agent interaction MUST be recorded in `AGENT_LOG.md` in the
same change that introduces the code — never as a later cleanup pass.
"Significant" means any interaction that creates or modifies source, KB schema,
tests, configuration, architecture, or dependencies.

Entries MUST follow the template in `CLAUDE.md`, MUST be appended
chronologically, and MUST NOT be reordered, renumbered, or retro-edited;
corrections go in a new entry referencing the original. Prompts MUST be quoted
verbatim. Rejected agent output and failed attempts MUST be recorded with
reasoning.

*Rationale*: The log is a deliverable and an accountability record. A polished
log that hides rollbacks is worth less than an honest one.

### VII. Test Coverage of Risk Bands

Jest unit tests MUST cover all three risk bands — STANDARD, ELEVATED, and
HIGH_RISK — with at least one asserting case each. Tests MUST assert against
values derived from the KB rather than duplicating magic numbers, so that a KB
change surfaces as a deliberate test update and not a silent drift.

Any new KB operator or compound-condition capability MUST ship with unit tests
for the evaluator, not only for the endpoint.

*Rationale*: Band boundaries are where premium outcomes change discontinuously;
they are the highest-value assertions in the system.

## Technology Constraints

- **Frontend**: Angular 17+, standalone components with external templates
  (`templateUrl`) and external styles (`styleUrl`), Angular Signals, RxJS
  `HttpClient` for transport only. A reusable `RiskBandBadgeComponent` accepting
  a `riskBand` input MUST exist. The UI MUST display `appliedFactors` using
  KB-sourced labels rather than frontend-local copies of factor descriptions.
- **Backend**: Node.js with TypeScript, Zod for validation, Jest for tests, a
  single `POST /policy/quote` endpoint.
- **Knowledge Base**: A structured JSON or YAML file with a `version` field,
  `basePremium`, `coverageLoadFactor`, `riskBands` (including `riskMultiplier`),
  and `factors`.
- **Premium formula**: `basePremium × riskMultiplier × coverageLoadFactor`,
  with every operand sourced from the KB.
- **Startup**: Each service MUST start with a single `npm start` command, and
  the README MUST get both services running in five commands or fewer.
- **Documentation**: `README.md` MUST document the KB file location.
  `SOLUTION.md` MUST exist and MUST NOT exceed 300 words.

## Development Workflow & Quality Gates

1. Specification and planning artifacts precede implementation, following the
   Spec Kit workflow in `.specify/`.
2. Before merging any change, the following gates MUST pass:
   - No `any` types introduced.
   - No scoring constants present in application code (Principle I).
   - No inline `template:` or `styles:` in any `@Component` decorator
     (Principle II).
   - Jest suite green, including all three band cases.
   - `AGENT_LOG.md` updated for every significant agent interaction.
3. A change that adds a risk factor MUST be demonstrable as a KB-only diff. If
   engine code changed, the change MUST be justified as a new *capability*
   (e.g. a new operator or compound condition), not as a new *rule*.
4. Documentation directly affected by a change MUST be updated in the same
   change.

## Governance

This constitution supersedes other conventions and ad-hoc preferences for this
project. Where guidance conflicts, the constitution wins; `CLAUDE.md` provides
runtime agent guidance subordinate to it.

**Amendment procedure**: Amendments MUST be proposed as an edit to this file,
MUST state the rationale, MUST record the version bump, and MUST include a Sync
Impact Report identifying dependent artifacts to update.

**Versioning policy**: Semantic versioning applies.
- MAJOR: a principle is removed or redefined in a backward-incompatible way.
- MINOR: a principle or section is added, or guidance materially expanded.
- PATCH: clarifications, wording, and non-semantic refinements.

**Compliance review**: Every review MUST verify the Development Workflow gates
above. Deviations MUST be recorded in the plan's Complexity Tracking table with
the justification and the rejected simpler alternative. Undocumented deviations
MUST be treated as defects.

**Version**: 1.1.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-29
