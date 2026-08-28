# PolicyQuote

A home insurance quoting tool. A customer enters their details; the service
returns an indicative premium **and a complete explanation of how it reached it**
— the risk score, the band, every factor that applied, and the arithmetic behind
the price.

The point of the design is that **all the risk logic lives in a single JSON file**
(`risk-kb.json`) rather than in code. Adding a risk factor, retuning points,
moving a band boundary, changing the base premium or rewording what a customer is
told is a one-file edit with no code change, no redeploy of logic, and no
developer required.

## Prerequisites

- **Node.js ≥ 22.12** (developed against 22.22.3) — the backend runs TypeScript
  directly via native type stripping, so there is no build step.
- **npm 10+**

## Getting both services running

```bash
npm --prefix backend install      # 1. backend dependencies
npm --prefix frontend install     # 2. frontend dependencies
npm --prefix backend start        # 3. API on http://localhost:3000 (leave running)
npm --prefix frontend start       # 4. UI on http://localhost:4200 (second terminal)
```

Then open <http://localhost:4200>. The dev server proxies `/policy/*` to the
backend, so no configuration is needed.

## Where the rules live

**`risk-kb.json`, at the root of this repository** — deliberately not buried
inside a source folder, because editing it is a routine act for a pricing
specialist, not a code change.

It contains four things:

| Key | What it controls |
|---|---|
| `basePremium` | The starting price before any risk adjustment |
| `coverageLoadFactor` | A flat multiplier applied to every quote |
| `riskBands` | Score ranges, their multipliers, and the wording shown to customers |
| `factors` | The risk rules: a condition, the points it adds, and its customer-facing description |

### Editing it

Change a value, save, and restart the backend. The file is validated on startup:
if it is malformed — a band gap, an unknown operator, a duplicate id, a typo in a
summary placeholder — **the service refuses to start and tells you exactly what
is wrong and which rule caused it**, rather than starting up and quietly
mis-pricing.

A factor looks like this:

```json
{
  "id": "property_high_value",
  "description": "Property valued over £500,000 — greater rebuild and contents exposure",
  "condition": { "field": "propertyValue", "operator": "gt", "value": 500000 },
  "points": 25
}
```

Conditions can be a single comparison, or nested groups combining several:

```json
{
  "condition": {
    "all": [
      { "field": "propertyType", "operator": "eq", "value": "Flat" },
      { "field": "propertyValue", "operator": "gt", "value": 500000 }
    ]
  }
}
```

Available operators: `eq`, `gt`, `gte`, `between`, `outside range`, `startsWith`.
Groups: `all` (AND), `any` (OR), `not` (true when no member matches). Groups nest
to any depth. A factor may also score **per occurrence** — points multiplied by a
nominated numeric field, such as points per previous claim.

The full contract is documented in
[`specs/001-policy-quote-app/contracts/risk-kb.schema.json`](specs/001-policy-quote-app/contracts/risk-kb.schema.json),
and a test validates the shipped file against it.

## Trying the API directly

```bash
curl -s -X POST localhost:3000/policy/quote \
  -H 'content-type: application/json' \
  -d '{"customerName":"Ada Lovelace","age":36,"propertyType":"House",
       "propertyValue":320000,"postcode":"SW1A 1AA","previousClaims":0}'
```

## Running the tests

```bash
npm --prefix backend test
```

## Project layout

```
risk-kb.json          all risk rules — the file you edit
backend/              Lambda-style handler + a thin node:http adapter
  src/kb/             loads and validates the Knowledge Base
  src/engine/         scoring, banding, pricing, summary composition
  src/api/            request validation and error mapping
frontend/             Angular 20, standalone + zoneless signals
specs/                specification, plan, contracts
AGENT_LOG.md          record of every AI agent interaction
SOLUTION.md           architecture summary
```

## Further reading

- [`SOLUTION.md`](SOLUTION.md) — architecture and design decisions
- [`specs/001-policy-quote-app/quickstart.md`](specs/001-policy-quote-app/quickstart.md)
  — a guided walkthrough, including a worked "add a flood-zone factor" demonstration
- [`AGENTS.md`](AGENTS.md) — conventions for AI agents working in this repository
