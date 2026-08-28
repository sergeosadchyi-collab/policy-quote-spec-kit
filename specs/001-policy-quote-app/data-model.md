# Phase 1 Data Model: PolicyQuote

**Feature**: `001-policy-quote-app` | **Date**: 2026-08-28
**Derived from**: [spec.md](./spec.md) Key Entities + Functional Requirements

All types are defined once as Zod schemas and surfaced to TypeScript via
`z.infer<>` (research R5). No hand-written interface duplicates a schema.
`any` appears nowhere; untrusted input is `unknown` until parsed.

---

## 1. QuoteRequest

The details a customer submits. Validated by Zod before reaching the engine
(FR-002, Principle III).

| Field | Type | Validation | Source |
|-------|------|-----------|--------|
| `customerName` | `string` | trimmed, 1–100 chars, non-empty | FR-001, FR-002a |
| `age` | `number` | integer, 18–120 inclusive | FR-001, FR-002a |
| `propertyType` | `'House' \| 'Flat' \| 'Bungalow'` | enum, exact match | FR-001 |
| `propertyValue` | `number` | finite, > 0, ≤ 100,000,000 | FR-001, FR-002a |
| `postcode` | `string` | trimmed, uppercased, UK postcode pattern | FR-001, Assumptions |
| `previousClaims` | `number` | integer, ≥ 0, ≤ 50 | FR-001, FR-002a |

**Notes**

- The numeric bounds above are fixed by **FR-002a**, which exists so that
  "outside accepted ranges" is measurable and SC-007 has an agreed threshold.
  The age range of 18–120 rejects nonsense without excluding the over-75 risk
  factor the KB targets.
- **Canonical postcode pattern** — one definition, used by both the server
  (`request-schema.ts`) and the client form, which MUST import or restate this
  exact rule rather than invent its own:

  ```
  /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/
  ```

  Applied **after** trim + uppercase normalisation. It accepts the standard UK
  outward/inward forms with an optional separating space, and deliberately does
  not attempt to validate against the live postcode file — the spec treats
  postcode as captured, not verified.
- `postcode` is normalised (trim + uppercase) **before** evaluation so that a
  prefix-matching geography factor behaves consistently. It is captured but not
  scored by default (spec Assumptions).
- No field is optional. Missing fields produce a field-level validation error,
  never a defaulted value — a defaulted value would silently mis-price.

**Normalisation is part of parsing.** The Zod schema applies the transforms, so
the engine only ever sees a normalised request and cannot forget to normalise.

---

## 2. RiskKnowledgeBase

The externally maintained, versioned rules set. Lives at `risk-kb.json` in the
repository root (research R12). Loaded and validated once at service start
(spec Assumptions: "Rules are loaded at service start").

| Field | Type | Validation |
|-------|------|-----------|
| `version` | `string` | valid semver; must satisfy the service's supported range (FR-013a) |
| `basePremium` | `number` | finite, > 0 |
| `coverageLoadFactor` | `number` | finite, > 0 |
| `riskBands` | `RiskBand[]` | non-empty; contiguous, non-overlapping, ascending |
| `factors` | `RiskFactor[]` | may be **empty** (valid zero-score quote — edge case); `id` values unique |

**Cross-field validations performed at load time** (FR-012):

1. Bands sorted ascending by `min` must satisfy `band[i].max + 1 === band[i+1].min`
   — no gaps (would make a score unresolvable) and no overlaps (would make band
   resolution ambiguous).
2. Every `summaryTemplate` placeholder must be in the engine's published
   placeholder set (FR-014b).
3. Every factor `condition` must recursively resolve to known operators; an
   unknown operator names the offending factor in the error (edge case).
4. No group condition may have an empty `conditions` array (edge case).
5. Any factor with `perOccurrence: true` must nominate `occurrenceField` (edge case).
6. Factor `id` values must be unique — duplicates would double-count.

**Failure taxonomy** — these are deliberately distinct (spec edge cases):

| Failure | Condition | Behaviour |
|---------|-----------|-----------|
| `KbNotFoundError` | file missing/unreadable | refuse to start |
| `KbMalformedError` | invalid JSON, or schema/cross-field violation | refuse to start, report path of offending node |
| `KbUnsupportedVersionError` | structurally valid, `version` outside supported range | refuse to start, report version **found** and range **expected** |

---

## 3. RiskBand

A named classification with an inclusive score range (FR-006).

| Field | Type | Validation |
|-------|------|-----------|
| `id` | `string` | non-empty, unique; e.g. `STANDARD`, `ELEVATED`, `HIGH_RISK` |
| `label` | `string` | non-empty; customer-facing, e.g. `"HIGH RISK"` |
| `min` | `number` | integer, ≥ 0 |
| `max` | `number` | integer, ≥ `min` |
| `riskMultiplier` | `number` | finite, > 0 |
| `summaryTemplate` | `string` | non-empty; placeholders validated at load |

**Resolution rules**

- Boundaries are **inclusive at both ends**: a band matches when
  `min <= score <= max` (edge case: "score exactly on a band boundary").
- A score exceeding the greatest `max` resolves to the **last** band in
  ascending order, never an error (edge case: "score above the highest band
  boundary"). This is computed positionally — no band `id` is referenced in
  code, per Principle I.
- `id` is the machine key returned in the API response and used by the frontend
  badge; `label` is the display string. Separating them means rewording a band
  for customers does not change the API contract or break the badge's styling
  hook.

---

## 4. RiskFactor

A single named rule (FR-008, FR-011, FR-014).

| Field | Type | Validation |
|-------|------|-----------|
| `id` | `string` | non-empty, unique across `factors` |
| `description` | `string` | non-empty; the **only** source of customer-facing factor text (FR-014, FR-016) |
| `condition` | `Condition` | recursive; see §5 |
| `points` | `number` | finite (may be negative — a discount is a legitimate rule) |
| `perOccurrence` | `boolean` | optional, defaults `false` |
| `occurrenceField` | `string` | **required when** `perOccurrence` is `true`; names the numeric request field supplying the count |

**Scoring semantics**

- Standard factor (`perOccurrence` falsy): contributes `points` **once** when
  its condition matches, regardless of magnitude.
- Per-occurrence factor: contributes `points × request[occurrenceField]`.
  The count comes from the explicitly nominated field, never inferred from the
  condition structure — this is what makes the total unambiguous when the
  condition is a compound group (edge case).
- A per-occurrence factor whose count is `0` contributes `0` points **and is
  not listed** as applied (edge case: "zero previous claims").
- Overlapping factors both apply and are both listed; mutual exclusivity is the
  KB author's responsibility (edge case).

---

## 5. Condition (recursive)

A condition is **either** a leaf comparison **or** a group (FR-010, FR-010a).
Nestable to arbitrary depth. Cross-field comparison is out of scope.

### 5a. LeafCondition

```
{ field: string, operator: LeafOperator, ...operands }
```

| Operator | Operands | Semantics | Requirement |
|----------|----------|-----------|-------------|
| `eq` | `value` | strict equality | FR-010 |
| `gt` | `value` | `field > value` | FR-010 |
| `gte` | `value` | `field >= value` | FR-010 |
| `between` | `min`, `max` | `min <= field <= max` (inclusive) | FR-010 |
| `outside range` | `min`, `max` | `field < min \|\| field > max` | FR-010 |
| `startsWith` | `value` (string) | case-sensitive prefix match on a string field | plan.md decision |

`startsWith` exceeds FR-010's five-operator floor and ships in v1 so that
flood-zone postcode-prefix factors are addable as pure KB entries, per the
spec's Assumptions. It matches against the **normalised** request value (§1).

Operand shape is enforced **per operator** by a discriminated union, so
`{ operator: 'between', value: 3 }` fails at load time rather than evaluating
against `undefined`.

`field` must name a key of `QuoteRequest`; an unknown field is a load-time
validation error, not a silent `false`.

### 5b. GroupCondition

```
{ all: Condition[] } | { any: Condition[] } | { not: Condition[] }
```

| Combinator | Semantics |
|-----------|-----------|
| `all` | logical AND over children |
| `any` | logical OR over children |
| `not` | negation; NOR over children (true when no child matches) |

- Each array MUST be non-empty (edge case: an empty group defaulting to either
  `true` or `false` would silently mis-price).
- Groups evaluate through the **same** `evaluateCondition` entry point as
  leaves (FR-010b), so depth costs no engine change.

**Worked example** — the brief's "flat AND over £500k" question:

```json
{ "all": [
  { "field": "propertyType",  "operator": "eq", "value": "Flat" },
  { "field": "propertyValue", "operator": "gt", "value": 500000 }
] }
```

---

## 6. AppliedFactor

A record of a factor that matched a specific request (FR-005, FR-016).

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | copied from the KB factor |
| `description` | `string` | copied from the KB factor — never authored in code |
| `points` | `number` | the points **actually contributed** (post per-occurrence multiplication) |

`points` is the contributed total, not the KB's per-unit `points`, so the listed
values sum exactly to `riskScore`. A customer can add up the displayed numbers
and reconcile them with the score (SC-005).

---

## 7. CoverageDetails

The pricing breakdown that produced the premium (FR-005a). Every value is
KB-sourced, making the arithmetic auditable.

| Field | Type | Source |
|-------|------|--------|
| `basePremium` | `number` | KB |
| `riskMultiplier` | `number` | KB, from the resolved band |
| `coverageLoadFactor` | `number` | KB |
| `annualPremium` | `number` | computed, rounded to 2dp |

Cover limits, excesses and exclusions are out of scope (spec Assumptions).

---

## 8. QuoteResult

The successful response payload (FR-004, FR-005, FR-013).

| Field | Type | Notes |
|-------|------|-------|
| `monthlyPremium` | `number` | 2dp; derived as `annualPremium / 12`, rounded |
| `annualPremium` | `number` | 2dp; authoritative (FR-004a) |
| `riskBand` | `string` | resolved band `id` |
| `riskBandLabel` | `string` | resolved band `label` |
| `riskScore` | `number` | unrounded sum of applied factor contributions (FR-004b) |
| `riskSummary` | `string` | composed from the band's KB template + appended factor descriptions |
| `coverageDetails` | `CoverageDetails` | §7 |
| `appliedFactors` | `AppliedFactor[]` | §6; empty array when nothing matched |
| `kbVersion` | `string` | active KB `version` (FR-013) |

---

## 9. Derivation pipeline

Ordering matters: the summary template may reference the premium, so summary
composition is necessarily last.

```
QuoteRequest (validated, normalised)
      │
      ▼  for each KB factor: evaluateCondition(factor.condition, request)
AppliedFactor[]  ──sum of contributed points──▶  riskScore   (unrounded)
      │                                              │
      │                                              ▼  min <= score <= max, clamp to last band
      │                                          RiskBand
      │                                              │
      │                          basePremium × riskMultiplier × coverageLoadFactor
      │                                              ▼  round once → 2dp
      │                                         annualPremium
      │                                              │  ÷ 12, round → 2dp
      │                                        monthlyPremium
      │                                              │
      └──────────────▶ summaryTemplate substitution + factor descriptions
                                                     ▼
                                               QuoteResult
```

**Rounding occurs at exactly two points** (FR-004b): the annual premium, and the
monthly premium derived from the already-rounded annual. `riskScore`, the
multiplier product, and the coverage load are never rounded.

**Determinism** (FR-020, SC-008): every operand originates from the request or
the KB. No clock, no randomness, no network, no environment lookup participates
in the pipeline.

---

## 10. Summary template placeholders

The engine publishes a closed set. Any other `{{token}}` in a KB template is a
load-time validation failure (FR-014b).

| Placeholder | Substituted with |
|------------|------------------|
| `{{customerName}}` | request `customerName` |
| `{{riskScore}}` | computed `riskScore` |
| `{{riskBandLabel}}` | resolved band `label` |
| `{{annualPremium}}` | rounded annual premium, 2dp |
| `{{monthlyPremium}}` | rounded monthly premium, 2dp |
| `{{appliedFactorCount}}` | `appliedFactors.length` |
| `{{propertyType}}` | request `propertyType` |

Adding a placeholder is an engine **capability** change (new entry in the
published set) and must ship with a test, per Development-Workflow gate 3.

---

## 11. Frontend state model (Principle II)

All local UI state is Angular Signals; no `BehaviorSubject`/`Subject`.

| Signal | Type | Kind |
|--------|------|------|
| `loading` | `boolean` | `signal` |
| `quoteResult` | `QuoteResult \| null` | `signal` |
| `errorMessage` | `string \| null` | `signal` |
| `canSubmit` | `boolean` | `computed` — form valid **and** not `loading` (FR-017) |
| `hasResult` | `boolean` | `computed` from `quoteResult` |

`HttpClient` returns an Observable; it is converted to signal state at the
service boundary (research R2, Principle II). Submitting while `loading` is
`true` is impossible because `canSubmit` gates the control — duplicate
concurrent submission is prevented by derived state, not by an imperative flag
(FR-017).

Error state and result state are mutually exclusive: a new submission clears
both before dispatch, so a stale quote can never sit beside a fresh error
(FR-018, User Story 1 scenario 3).
