# Contract: Frontend Component & State Interfaces

**Feature**: `001-policy-quote-app`
**Governs**: Constitution Principle II (Signals-Only Frontend State),
Technology Constraints, FR-015 – FR-018.

---

## 1. `RiskBandBadgeComponent` (required by the constitution)

A reusable, standalone component presenting the risk band as a distinct visual
badge that varies by band (FR-015).

```ts
@Component({ selector: 'pq-risk-band-badge', standalone: true, /* ... */ })
export class RiskBandBadgeComponent {
  readonly riskBand = input.required<string>();   // band id, e.g. 'HIGH_RISK'
  readonly label    = input.required<string>();   // KB label, e.g. 'HIGH RISK'
}
```

| Aspect | Contract |
|--------|----------|
| Inputs | Signal-based `input()`, not `@Input()` decorators |
| `riskBand` | The band **id** from the API — used only as a styling hook |
| `label` | The band **label** from the KB — the text actually rendered |
| Styling | Hand-authored CSS keyed off the band id; no UI library (Principle V) |
| Unknown band id | Renders with neutral default styling and still shows `label` |

**Why the id/label split**: the component renders KB-supplied text and never
maps an id to a display string in code. A new band added to the KB renders
correctly with default styling and no frontend change (FR-014a). Hardcoding
`riskBand === 'HIGH_RISK' ? 'HIGH RISK' : ...` would put customer-facing prose
back into product logic.

---

## 2. Quote API client

```ts
@Injectable({ providedIn: 'root' })
export class QuoteApiService {
  requestQuote(request: QuoteRequest): Observable<QuoteResult>;
}
```

| Aspect | Contract |
|--------|----------|
| Transport | `HttpClient` POST to the relative path `/policy/quote` |
| Base URL | Relative — resolved by the dev-server proxy (research R4); no compiled-in host |
| Return | The framework-native `Observable`, converted to signals **at the consuming component boundary** (Principle II) |
| Error mapping | HTTP/validation errors are translated to a display message by the consumer, not thrown to the console |

RxJS appears here and nowhere else: it is permitted only as the framework-native
`HttpClient` interface.

---

## 3. Component state contract

All local UI state is Angular Signals. `BehaviorSubject` and `Subject` are
prohibited (Principle II).

| Member | Kind | Type | Requirement |
|--------|------|------|-------------|
| `loading` | `signal` | `boolean` | FR-017 |
| `quoteResult` | `signal` | `QuoteResult \| null` | FR-005 |
| `errorMessage` | `signal` | `string \| null` | FR-018 |
| `canSubmit` | `computed` | `boolean` | form valid **and** `!loading()` — FR-017 |
| `hasResult` | `computed` | `boolean` | derived from `quoteResult` |

**Duplicate submission is prevented by derived state**, not an imperative guard:
the submit control is disabled by `canSubmit`, which already accounts for
`loading`. There is no second flag that could drift out of sync (FR-017).

**Result and error are mutually exclusive**: a new submission clears both
signals before dispatch, so a stale quote can never sit beside a fresh error
(FR-018, User Story 1 scenario 3). Retry re-invokes the same path with no page
reload.

---

## 4. Applied factor rendering

The result view iterates `quoteResult().appliedFactors` and renders each
`description` **verbatim from the response** (FR-016).

Prohibited: any frontend map, enum, dictionary or `switch` from factor `id` to
display text. A factor added to the KB must appear in the UI with its new
description and **zero** frontend changes (User Story 3, SC-005).

An empty `appliedFactors` array renders as an explicit "no risk factors
applied" state, not a blank region (User Story 2 scenario 1).

---

## 5. Form contract

A reactive form capturing exactly the `QuoteRequest` fields (FR-001).

| Control | Type | Client-side validation |
|---------|------|----------------------|
| `customerName` | text | required, 1–100 chars |
| `age` | number | required, integer, 18–120 |
| `propertyType` | select | required, one of House / Flat / Bungalow |
| `propertyValue` | number | required, > 0 |
| `postcode` | text | required, UK postcode pattern |
| `previousClaims` | number | required, integer, ≥ 0 |

Client-side validation mirrors the server's Zod rules for responsiveness but is
**never** the authority: the backend re-validates every submission (FR-002).
Server-returned `issues[]` are surfaced against the named fields, so a rule that
exists only on the server still produces a field-specific message (SC-007).
