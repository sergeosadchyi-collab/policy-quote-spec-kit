# Exercise

Given your background building agentic systems and LLM infrastructure, this exercise expects you to actively demonstrate how you collaborate with AI agents to build software — not just acknowledge it in a document.
- Use an AI coding agent throughout — Cursor AI, Claude Code, GitHub Copilot, or equivalent
- Configure the agent with a custom skill or system prompt scoped to this project's patterns and conventions
- Use the agent to generate code from the Knowledge Base (see below) — not just for boilerplate
- Document every significant agent interaction in AGENT_LOG.md: what you asked, what it produced, what you changed, and why
- During the review session, you will demonstrate a live change using your agent — you must be able to explain every line the agent produces


## The Brief

Build a minimal PolicyQuote application — a single-page home insurance policy quoting tool that lets a customer enter their details and receive an instant premium estimate with a risk assessment. 
The app must demonstrate full-stack competency: an Angular frontend, a Node.js Lambda-style backend, and a Knowledge Base-driven risk engine with clean, configurable architecture.

The core requirement beyond the standard implementation is this: the risk scoring rules must live in an external Knowledge Base config file, not in application code. 
The Lambda reads from the KB. Adding, removing, or changing a risk factor must require only a KB change — no code changes.


## What to Build

### Angular Frontend
- Angular 17+ standalone components only (no NgModules)
- Reactive form: customer name, age, property type (House/Flat/Bungalow), property value (£), postcode, number of previous claims in last 5 years
- Angular Signals for all UI state ( loading , quoteResult , errorMessage )
- Display: monthly premium (£), annual premium (£), risk band badge (STANDARD / ELEVATED / HIGH RISK), plain-English risk summary, and the active risk factors applied (from the KB)
- Reusable component: RiskBandBadgeComponent accepting riskBand input
- RxJS HttpClient → POST /policy/quote

### Node.js Backend (Lambda-style)
- Single endpoint: POST /policy/quote
- Input validation using Zod
- Risk scoring engine that reads rules from the KB config file — no hardcoded scoring values in application code
- Premium formula: basePremium × riskMultiplier × coverageLoadFactor
- Returns: { monthlyPremium, annualPremium, riskBand, riskScore, riskSummary, coverageDetails, appliedFactors }
- Export a handler(event, context) Lambda-compatible function
- Jest unit tests covering all 3 risk bands (3+ test cases)

## Knowledge Base (KB) — Core Requirement

### What the KB Must Be
The risk scoring rules must be maintained in a structured JSON or YAML configuration file (e.g. risk-kb.json ) that acts as the knowledge base for the scoring engine. 
The Lambda loads this file and applies the rules dynamically.
Adding a new risk factor must require only a KB change — zero code changes to the scoring engine.

### Example KB Structure (you may extend this)

```json
{
  "version": "1.0.0",
  "basePremium": 300,
  "coverageLoadFactor": 1.2,
  "riskBands": {
    "STANDARD": { "min": 0, "max": 25 },
    "ELEVATED": { "min": 26, "max": 60 },
    "HIGH_RISK": { "min": 61, "max": 999 }
  },
  "factors": [
    {
      "id": "age_young_elderly",
      "description": "Under 25 or over 75 — higher risk profile",
      "condition": {
        "field": "age",
        "operator": "outside range",
        "min": 25,
        "max": 75
      },
      "points": 20
    },
    {
      "id": "previous_claims_low",
      "description": "1–2 previous claims",
      "condition": {
        "field": "previousClaims",
        "operator": "between",
        "min": 1,
        "max": 2
      },
      "points": 15,
      "perOccurrence": true
    },
    {
      "id": "previous_claims_high",
      "description": "3 or more previous claims",
      "condition": {
        "field": "previousClaims",
        "operator": "gte",
        "value": 3
      },
      "points": 30,
      "perOccurrence": true
    },
    {
      "id": "property_type_flat",
      "description": "Flat — higher shared risk",
      "condition": {
        "field": "propertyType",
        "operator": "eq",
        "value": "Flat"
      },
      "points": 10
    },
    {
      "id": "property_value_high",
      "description": "Property value over £750,000",
      "condition": {
        "field": "propertyValue",
        "operator": "gt",
        "value": 750000
      },
      "points": 25
    }
  ]
}
```

### Risk Band Thresholds (from KB)

| Band      | Score Range | riskMultiplier |
|-----------|-------------|----------------|
| STANDARD  | 0–25        | 1.0            |
| ELEVATED  | 26–60       | 1.5            |
| HIGH RISK | 61+         | 2.2            |


## Configurability Requirement

The scoring engine must be KB-driven and table-driven — not a chain of if/else statements. 
The engine reads the KB, iterates the factors, evaluates each condition against the input, accumulates points, and determines the risk band. 
This means:
- Adding a new factor (e.g. "flood zone postcode — +15 points") requires only adding an entry to the KB JSON
- Changing a risk weight (e.g. claims penalty from 15 → 20 points) requires only a KB edit
- Removing a factor requires only deleting its KB entry
- The Lambda's scoring logic never needs to change for any of these — only the KB does

The Angular frontend should display the active risk factors that contributed to the score — surfaced from appliedFactors in the API response, driven by the KB labels.


## Live Review Session — What You Must Demonstrate

The review session is not just a code walkthrough. 
You will be asked to perform a live change using your AI agent:
1. Add a new risk factor to the KB — the panel will specify one on the day (e.g. "flood zone postcode prefix +15 points if postcode starts with 'EX' or 'PL'")
2. Use your AI agent to implement the change — show the agent interaction live
3. Demonstrate the change working in the running application
4. Explain every line the agent produced — why it chose that approach, what you validated, what you would change

You will also be asked to explain:
- The custom skill or system prompt you configured for your agent — why those instructions?
- Any output the agent produced that you rejected and why
- How your KB schema design would handle a factor that requires combining two fields (e.g. "flat AND over £500k")
- How you would extend this KB pattern to support version-controlled rule sets in production


## Constraints & Rules
1. Angular app must use Signals — no BehaviorSubject/Subject for local UI state.
2. Backend must export a handler(event, context) Lambda-compatible function.
3. Risk scoring logic must be KB-driven — no hardcoded scoring values in application code.
4. No external UI component libraries (Material, PrimeNG, Bootstrap) — demonstrate your own CSS skills.
5. No calls to any LLM or external API from the backend — all scoring logic must be deterministic and self-contained. The KB is a local config file, not a remote service.
6. Both services must start with a single npm start command each.
7. Include AGENT_LOG.md documenting every significant agent interaction — prompts given, output received, changes made, and reasoning.
8. Include SOLUTION.md (max 300 words) — architecture decisions, KB design choices, and one thing you'd improve with more time.

### Bonus (optional — shows depth)
- KB versioning: Add a version field to the KB and return the active KB version in the API response. Show how you'd manage breaking KB schema changes without redeploying the Lambda.
- Compound conditions in KB: Extend the KB schema to support a factor that requires two conditions (e.g. "Flat AND property value > £500k → +35 points"). Implement the engine support for compound AND/OR conditions.
- Dockerfile: Multi-stage build for the Node.js backend as a Fargate-deployable service with a GET /health endpoint that also returns the active KB version.
- Agent skill file: Include the custom skill/system prompt you configured for your AI agent as a committed file (e.g. .cursorrules , CLAUDE.md , or equivalent) — the panel wants to see how you instruct agents.


## Evaluation Criteria

| Area                                    | What We're Looking For                                                                                                                                                                           | MaxPoints |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|
| Knowledge Base Design & Configurability | KB schema is clean and extensible. Scoring engine is genuinely table-driven — no hardcoded conditions. Adding a new factor requires only a KB change.                                            | 25        |
| Agent Workflow & Skill Configuration    | AGENT_LOG.md is honest and specific. Agent prompts show intentional engineering, not vague "generate this app." Custom skill/instructions demonstrate understanding of agent context management. | 20        |
| Angular Signals & Reactivity            | Correct use of signal(), computed(), effect(). UI reflects appliedFactors from KB. No unnecessary BehaviorSubject.                                                                               | 20        |
| Lambda Handler & Risk Engine            | Clean handler export, KB loaded correctly, condition evaluator is generic (not a switch statement), typed response including appliedFactors.                                                     | 15        |
| Code Quality & TypeScript               | No any types, KB schema typed with interfaces, separation of concerns, clean naming.                                                                                                             | 10        |
| Live Demo & Explanation                 | Can add a new KB factor live and explain every change. Articulates agent output choices clearly. Explains what was rejected from agent output and why.                                           | 10        |
| Total                                   |                                                                                                                                                                                                  | 100       |


## Deliverables
- A public GitHub repository (or zip archive) with the complete code.
- README — both services running in under 5 commands total. KB file location documented.
- AGENT_LOG.md chronological log of every significant agent interaction: prompt given → output received → what you changed → why.
- SOLUTION.md (max 300 words) — KB schema design decisions, agent skill configuration rationale, and one thing you'd improve with more time.
- The KB config file (risk-kb.json or equivalent) committed to the repo as a first-class artifact, not buried in source folders.

