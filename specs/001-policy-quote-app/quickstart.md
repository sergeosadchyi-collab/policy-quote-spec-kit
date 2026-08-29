# Quickstart: PolicyQuote

**Feature**: `001-policy-quote-app` | **Date**: 2026-08-28

This is the developer-facing walkthrough that the eventual `README.md` will be
derived from. It exists to prove FR-019 and SC-009 — both services running in
**five commands or fewer** — are achievable with the planned structure.

---

## Prerequisites

- **Node.js ≥ 22.12** (developed against 22.22.3) and npm 10+.
- Nothing else. No Docker, no database, no cloud credentials, no API keys.
  The backend makes no network calls and reads its rules from a local file.

---

## Getting both services running (5 commands)

```bash
# 1. install backend dependencies
npm --prefix backend install

# 2. install frontend dependencies
npm --prefix frontend install

# 3. start the backend (http://localhost:3000) — leave running
npm --prefix backend start

# 4. in a second terminal, start the frontend (http://localhost:4200)
npm --prefix frontend start

# 5. open the app
open http://localhost:4200
```

The frontend dev server proxies `/policy/quote` to the backend, so the browser
sees a single origin and there is no CORS configuration to get right.

---

## Where the rules live

```
risk-kb.json          ← the Knowledge Base, at the repository root
```

It is deliberately **not** inside `backend/src/`. A pricing change should show
up as a top-level diff that a non-engineer can read and review, which is what
makes SC-004 ("verified by inspecting the diff") checkable.

The backend loads and validates this file once at startup. **A rules change
takes effect on restart** — there is no hot reload, by design.

---

## Verifying the backend directly

The handler is Lambda-compatible, so it can be exercised over HTTP or called
directly. Over HTTP:

```bash
curl -s http://localhost:3000/policy/quote \
  -H 'Content-Type: application/json' \
  -d '{
        "customerName": "Alice Fairweather",
        "age": 42,
        "propertyType": "House",
        "propertyValue": 320000,
        "postcode": "SW1A 1AA",
        "previousClaims": 0
      }'
```

Expected shape (figures depend on the KB in the repository):

```json
{
  "monthlyPremium": 30.00,
  "annualPremium": 360.00,
  "riskBand": "STANDARD",
  "riskBandLabel": "Standard",
  "riskScore": 0,
  "riskSummary": "Alice Fairweather, your House scored 0 and sits in our Standard band.",
  "coverageDetails": {
    "basePremium": 300,
    "riskMultiplier": 1.0,
    "coverageLoadFactor": 1.2,
    "annualPremium": 360.00
  },
  "appliedFactors": [],
  "kbVersion": "1.0.0"
}
```

Note `appliedFactors: []` — a profile matching no factors is a valid
lowest-band quote, not an error.

A deliberately invalid submission:

```bash
curl -s http://localhost:3000/policy/quote \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"","age":9,"propertyType":"Castle",
       "propertyValue":-5,"postcode":"","previousClaims":-1}'
```

returns `400` with one entry in `issues[]` per offending field and **no premium
figure** (SC-007).

---

## Running the tests

```bash
npm --prefix backend test
```

The suite covers all three risk bands (SC-006), the recursive condition
evaluator, every leaf operator, and each KB-validation failure mode.

Expectations are **derived from the loaded KB**, not restated as literals — so
editing `basePremium` in `risk-kb.json` does not silently break tests for the
wrong reason, and a genuine engine regression still fails loudly.

---

## The core demonstration: change the rules, not the code

This is the exercise's central claim and the live-review scenario. Adding a
"flood zone postcode" factor is a **`risk-kb.json`-only** change.

**1.** Append to the `factors` array in `risk-kb.json`:

```json
{
  "id": "flood_zone_postcode",
  "description": "Flood-risk postcode area — increased escape-of-water exposure",
  "condition": {
    "any": [
      { "field": "postcode", "operator": "startsWith", "value": "EX" },
      { "field": "postcode", "operator": "startsWith", "value": "PL" }
    ]
  },
  "points": 15
}
```

**2.** Restart the backend (`Ctrl-C`, then `npm --prefix backend start`).

**3.** Submit a quote with postcode `EX4 4QJ`. The factor appears in
`appliedFactors` with its new description, contributes 15 points, and may move
the quote into a higher band.

**4.** `git diff` shows changes to `risk-kb.json` **only**.

> **Note on `startsWith`.** The five operators required by FR-010 are `eq`,
> `gt`, `gte`, `between`, and `outside range`. `startsWith` is a sixth, and it
> **ships in v1** — a planning decision recorded in [plan.md](./plan.md),
> because the spec's Assumptions state that postcode is captured precisely so
> that flood-zone prefix factors can be added "without product changes". The
> capability therefore has to exist before the rule does; otherwise the very
> first geography factor would force an engine change and break the promise at
> the moment it is tested.
>
> So the step above genuinely is a KB-only diff. Adding a *seventh* operator
> later would be a capability change — one entry in the operator lookup table,
> one schema enum member, and a unit test, per Development-Workflow gate 3 and
> Principle VII — and still not a per-factor branch anywhere.

---

## Other KB-only changes to try

| Change | Edit | Observable effect |
|--------|------|-------------------|
| Retune a factor | `points: 15` → `20` | Score changes; a quote may cross a band boundary |
| Retire a factor | delete its array entry | It stops being applied and stops being listed |
| Move a boundary | `ELEVATED.max` (and the next band's `min`) | Band resolution shifts |
| Reprice everything | `basePremium` or `coverageLoadFactor` | All premiums move |
| Reword an explanation | a band's `summaryTemplate` | Customer-facing prose changes |
| Add a band | append to `riskBands` | New band resolves and renders with default badge styling |

Every one of these is zero code change (FR-009, SC-004).

---

## Deliberate failure modes

The service fails loudly rather than quoting on rules it may misread.

| Break this | Result |
|-----------|--------|
| Malformed JSON in `risk-kb.json` | Startup aborts naming the parse failure |
| Unknown operator on a factor | Startup aborts naming the offending factor |
| Empty `all` / `any` / `not` array | Startup aborts — neither `true` nor `false` is a safe default |
| `perOccurrence: true` without `occurrenceField` | Startup aborts — the count would be ambiguous |
| Typo in a `summaryTemplate` placeholder | Startup aborts — no partially substituted prose ever reaches a customer |
| Gap or overlap between band ranges | Startup aborts — a score must resolve to exactly one band |
| `version` outside the supported range | Startup aborts, naming the version **found** and the range **expected** |

Each is a distinct, testable error type — the unsupported-version case is
deliberately separate from the malformed case, because there the file is
structurally valid and only its version claim is unacceptable.
