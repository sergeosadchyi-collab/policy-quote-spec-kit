# Solution

## Architecture

Three layers, each with one job. `kb/` loads and validates `risk-kb.json`;
`engine/` scores, bands, prices and composes the summary; `api/` validates
requests and maps errors. The backend exports `handler(event, context)`, with a
thin `node:http` adapter over it — deployable to Lambda unchanged. The frontend is
Angular 20, standalone and zoneless, holding no risk rule of its own: every
customer-facing word arrives from the API.

## Knowledge Base design

Conditions are a recursive union — a leaf comparison or an `all`/`any`/`not`
group — resolved through one evaluator, so nesting depth is never a special case
and a factor of any complexity stays a KB-only addition. Operators and
combinators are frozen lookup tables rather than `switch` statements; adding one
is a table entry plus a test, never a new branch.

`riskBands` is an ordered array, and the resolver finds the highest band
*positionally*, so no band identifier appears in code. That is only sound because
load-time validation enforces ascending, contiguous, non-overlapping bands — the
two rules are a pair.

Validation is deliberately loud. A band gap, unknown operator, duplicate id or
mistyped summary placeholder stops the service starting and names the offending
rule. A mis-priced quote that looks fine is worse than a service that will not
boot.

## Agent workflow

Spec-Kit drove spec → plan → tasks → implement, with `/speckit-analyze` catching
gaps before code existed. `AGENT_LOG.md` records each step, including three
corrections worth more than the successes: a research note that guaranteed
something arithmetically false about rounding, a `not` combinator I implemented
against the published contract, and a KB error message too vague to act on.

## With more time

Property-based testing over generated Knowledge Bases, to attack the invariant
that displayed factor points always reconcile with the score.
