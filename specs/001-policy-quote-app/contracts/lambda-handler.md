# Contract: Lambda Handler & KB Loading

**Feature**: `001-policy-quote-app`
**Governs**: Constitution Principle III (Lambda-Compatible Backend Contract),
Principle V (Deterministic & Self-Contained), FR-012, FR-013a, FR-013b.

This is the internal contract between the transport layer, the handler, and the
Knowledge Base loader. The HTTP surface itself is specified in
[`policy-quote.openapi.yaml`](./policy-quote.openapi.yaml); the KB file format
in [`risk-kb.schema.json`](./risk-kb.schema.json).

---

## 1. Handler signature

The backend's core unit is a Lambda-compatible function:

```ts
export async function handler(
  event: QuoteApiEvent,
  context: QuoteApiContext,
): Promise<QuoteApiResponse>;
```

`QuoteApiEvent` is the subset of the API Gateway proxy event the handler
actually reads — narrow by design, so the handler is not coupled to fields it
ignores:

| Field | Type | Notes |
|-------|------|-------|
| `httpMethod` | `string` | `POST` expected; anything else → `405` |
| `path` | `string` | `/policy/quote` |
| `headers` | `Record<string, string \| undefined>` | |
| `body` | `string \| null` | raw JSON text, unparsed |
| `isBase64Encoded` | `boolean` | optional; decoded before parsing when true |

`QuoteApiContext` is likewise minimal (`awsRequestId`, `functionName`). The
handler MUST NOT require any context field to be present in order to produce a
correct quote — this keeps it callable directly from tests with a stub.

`QuoteApiResponse`:

| Field | Type |
|-------|------|
| `statusCode` | `number` |
| `headers` | `Record<string, string>` |
| `body` | `string` (serialised JSON) |

### Behavioural obligations

1. **Never throws.** Every failure path returns a structured response
   (Principle III). An unexpected internal fault becomes a `500` with an
   `ErrorResponse` body — the transport adapter has no error branch to write.
2. **Parses defensively.** `body` is `unknown` until Zod has parsed it. A
   `null` body, non-JSON text, or a JSON array all yield `400`, not a crash.
3. **Deterministic.** No clock, randomness, environment lookup, network call, or
   LLM participates in producing the response body (Principle V, FR-020).
4. **Stateless per invocation.** The only cross-invocation state is the
   immutable, already-validated KB loaded at module initialisation.

---

## 2. Transport adapter contract

The `node:http` server is a **thin adapter over the handler, never the reverse**
(Principle III, research R3). Its entire responsibility:

```
IncomingMessage ──▶ collect body ──▶ build QuoteApiEvent ──▶ handler(event, ctx)
                                                                  │
ServerResponse ◀── write statusCode + headers + body ◀─────────────┘
```

The adapter MUST NOT contain: routing decisions that affect the response body,
input validation, scoring logic, or error classification. Method and path
checking live in the handler so that behaviour is identical whether invoked over
HTTP or by a direct Lambda call.

**Verification**: the handler's test suite calls `handler()` directly with
constructed events and never starts an HTTP server. If a behaviour can only be
tested through the server, it is in the wrong layer.

---

## 3. KB loading contract

The KB is read from a **local file** — never fetched from a remote service
(Principle V, FR-007).

```ts
export function loadKnowledgeBase(filePath: string): RiskKnowledgeBase;
```

Executed once at module initialisation, before the server accepts connections.

### Load sequence

| Step | Failure raises |
|------|----------------|
| 1. Read the file from disk | `KbNotFoundError` |
| 2. Parse as JSON | `KbMalformedError` |
| 3. Validate against the Zod KB schema | `KbMalformedError` |
| 4. Check `version` satisfies `SUPPORTED_KB_VERSION_RANGE` | `KbUnsupportedVersionError` |
| 5. Cross-field validation (see §4) | `KbMalformedError` |

The version check sits **after** structural validation deliberately: a file must
be well-formed before its version claim is meaningful, and the two failures are
distinct spec edge cases requiring different messages.

### Startup failure behaviour

Any of the three errors MUST prevent startup: the message is written to stderr
and the process exits with a non-zero code. The service MUST NOT start and
serve quotes from partial, defaulted, or unsupported rules (FR-012, FR-013b,
spec edge cases).

`KbUnsupportedVersionError` MUST name both the version **found** and the range
**expected** (FR-013b), and MUST NOT coerce or downgrade the version.

**Supported range** is a declared constant, e.g.:

```ts
export const SUPPORTED_KB_VERSION_RANGE = '>=1.0.0 <2.0.0';
```

Meaning: additive KB revisions (PATCH/MINOR) keep working without redeployment;
a schema-breaking revision (MAJOR) stops the service loudly.

---

## 4. Cross-field KB validations

Performed at load time, after schema validation. Each failure names the
offending node so the operator who made the edit can find it.

| # | Rule | Rationale |
|---|------|-----------|
| 1 | Bands sorted by `min` are contiguous: `band[i].max + 1 === band[i+1].min` | No gaps (unresolvable score) and no overlaps (ambiguous band) |
| 2 | Factor `id` values are unique | Duplicates would double-count |
| 3 | Every leaf `field` names a key of `QuoteRequest` | An unknown field must not silently evaluate false |
| 4 | Every leaf operator is in the operator table | Unknown operator is a validation error naming the factor (edge case) |
| 5 | Every group's `conditions` array is non-empty | Neither `true` nor `false` is a safe default (edge case) |
| 6 | `perOccurrence: true` implies `occurrenceField` present and numeric in `QuoteRequest` | Occurrence count must be unambiguous (edge case) |
| 7 | Every `{{placeholder}}` in every `summaryTemplate` is in the published set | Unresolvable placeholder must fail loudly, not substitute partially (FR-014b) |

---

## 5. Engine module boundaries

Principle IV requires KB loading, condition evaluation, premium calculation, and
transport wiring to be separate, independently unit-testable units.

| Unit | Responsibility | Must not |
|------|---------------|----------|
| `kb/kb-schema` | Zod schema + inferred types | know about HTTP or scoring |
| `kb/kb-loader` | read, validate, version-gate | know about HTTP |
| `engine/operators` | leaf operator lookup table | know about factors or bands |
| `engine/combinators` | `all`/`any`/`not` lookup table | know about factors |
| `engine/condition-evaluator` | recursive dispatch | know about points or premiums |
| `engine/scoring` | iterate factors, accumulate, collect applied | know about premiums or HTTP |
| `engine/band-resolver` | score → band, clamp to last | reference any band by name |
| `engine/premium-calculator` | formula + the two rounding points | know about summaries |
| `engine/summary-composer` | template substitution | author prose |
| `handler` | orchestrate, map errors to responses | contain scoring values |
| `server` | HTTP ↔ event translation | contain anything else |

**The prohibition that matters most**: no module above may contain a scoring
constant, a band boundary, a factor identifier, or a `switch`/`if` chain that
branches per factor (Principle I). `band-resolver` identifies the highest band
**positionally**, never by the name `HIGH_RISK`.
