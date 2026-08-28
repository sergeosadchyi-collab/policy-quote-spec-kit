# Feature Specification: PolicyQuote — Home Insurance Quoting Tool

**Feature Branch**: `001-policy-quote-app`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Based on exercise.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get an instant premium quote (Priority: P1)

A prospective home insurance customer visits a single-page quoting tool, enters
their personal and property details, and immediately receives a premium estimate
without speaking to an agent or creating an account.

**Why this priority**: This is the core value exchange of the product. Without
it, nothing else in the feature has a reason to exist. It is the smallest slice
that is independently shippable and demonstrable.

**Independent Test**: Enter a complete, valid set of customer details and confirm
a monthly and annual premium figure is returned and displayed. Delivers a usable
quoting tool even with no explanation or configurability layered on top.

**Acceptance Scenarios**:

1. **Given** a customer on the quote page with an empty form, **When** they enter
   a name, age, property type, property value, postcode, and number of previous
   claims, and submit, **Then** the tool displays a monthly premium and an annual
   premium in pounds sterling.
2. **Given** a customer has submitted the form, **When** the estimate is being
   calculated, **Then** the tool shows a loading indication and prevents a
   duplicate submission.
3. **Given** a customer has received a quote, **When** they change any input and
   resubmit, **Then** a freshly calculated quote replaces the previous one.

---

### User Story 2 - Understand why the premium is what it is (Priority: P2)

Having received a figure, the customer wants to know how it was arrived at. They
see a risk band, a plain-English summary, and the specific list of risk factors
that were applied to their circumstances.

**Why this priority**: A bare number is not actionable or trustworthy.
Explainability is what converts a quote into a decision, and it is the
differentiator over a generic calculator. It depends on P1 existing but adds
distinct, separately testable value.

**Independent Test**: Submit a profile known to trigger specific risk factors and
confirm each triggered factor is listed by its published description, that the
risk band shown matches the accumulated score, and that a readable summary is
present. Testable without any rule-editing capability.

**Acceptance Scenarios**:

1. **Given** a customer whose details trigger no risk factors, **When** the quote
   is returned, **Then** a STANDARD risk band is displayed and no risk factors
   are listed as applied.
2. **Given** a customer whose details trigger one or more risk factors, **When**
   the quote is returned, **Then** each applied factor is listed with its
   human-readable description, and the displayed risk band reflects the total
   accumulated risk score.
3. **Given** a returned quote of any band, **When** the customer views the
   result, **Then** a risk band badge is displayed that is visually
   distinguishable between STANDARD, ELEVATED, and HIGH RISK.
4. **Given** a returned quote, **When** the customer reads the result, **Then** a
   plain-English risk summary and the coverage details behind the premium are
   shown.

---

### User Story 3 - Change the risk rules without changing the product (Priority: P3)

An underwriting or pricing specialist needs to add a new risk factor, adjust the
points attached to an existing one, retire a factor, or move a risk band
boundary. They do this by editing a single, published rules knowledge base — with
no change to the quoting product's logic.

**Why this priority**: This is the strategic requirement. Pricing rules change on
an actuarial cadence; the product does not. Separating them is what makes the
tool operationally viable. It is ranked P3 only because P1 and P2 must exist for
a rule change to be observable.

**Independent Test**: Add a new risk factor to the rules knowledge base, restart
the service, submit a profile that matches the new factor, and confirm the factor
appears in the applied factors and changes the score — with no edit to any
product logic. Verifiable by inspecting the change as a rules-only diff.

**Acceptance Scenarios**:

1. **Given** the rules knowledge base contains a defined set of risk factors,
   **When** a specialist adds a new factor with a condition, description, and
   point value, **Then** a matching customer profile has that factor applied,
   listed by its new description, and reflected in the score — with no change to
   product logic.
2. **Given** an existing factor, **When** its point value is changed in the rules
   knowledge base, **Then** subsequent quotes for a matching profile reflect the
   new points and may move to a different risk band.
3. **Given** an existing factor, **When** it is removed from the rules knowledge
   base, **Then** it is no longer applied to or listed for any quote.
4. **Given** the base premium, coverage load factor, band boundaries, or a band's
   risk multiplier is changed in the rules knowledge base, **Then** subsequent
   quotes reflect the new values.
5. **Given** a quote has been produced, **When** the result is returned, **Then**
   it identifies the version of the rules knowledge base that produced it.

---

### User Story 4 - Be stopped from submitting bad details (Priority: P4)

A customer who enters incomplete, malformed, or out-of-range details is told
clearly what is wrong and how to fix it, rather than receiving a nonsensical
quote or a silent failure.

**Why this priority**: Protects the integrity of every quote and is a baseline
usability expectation, but the product is demonstrable without it.

**Independent Test**: Submit each category of invalid input and confirm a
specific, human-readable message is shown and no quote is produced.

**Acceptance Scenarios**:

1. **Given** a customer leaves a required field empty, **When** they attempt to
   submit, **Then** submission is prevented and the offending field is
   identified.
2. **Given** a customer enters a value outside the accepted range — such as a
   negative property value, a negative claim count, or an implausible age —
   **When** they submit, **Then** no quote is produced and a specific message
   explains the constraint.
3. **Given** the quoting service is unreachable or returns an error, **When** the
   customer submits, **Then** a friendly error message is displayed, the loading
   state is cleared, and the customer can retry without reloading the page.

---

### Edge Cases

- **Score above the highest band boundary**: a profile accumulating more points
  than the top band's defined range MUST still resolve to the highest band rather
  than failing.
- **Score exactly on a band boundary**: boundaries are inclusive at both ends; a
  score landing exactly on a boundary resolves deterministically to a single band
  with no ambiguity or gap between adjacent bands.
- **Repeating factors**: a factor marked as accruing per occurrence multiplies its
  points by the count of the matched occurrences, whereas a standard factor
  contributes its points once regardless of magnitude.
- **Overlapping factors**: where two factors both match the same profile, both
  apply and both are listed; the rules knowledge base author is responsible for
  ensuring mutual exclusivity where that is intended.
- **Zero previous claims**: a claims-based factor with a per-occurrence rule and
  zero occurrences contributes zero points and is not listed as applied.
- **Malformed or unreadable rules knowledge base**: the service MUST fail loudly
  and refuse to start or refuse to quote, rather than silently quoting on partial
  or default rules.
- **Unknown condition operator in the rules knowledge base**: MUST be rejected as
  a rules validation error identifying the offending factor, not silently skipped.
- **Empty factor list**: a rules knowledge base with no factors MUST produce a
  valid zero-score, lowest-band quote rather than an error.

## Requirements *(mandatory)*

### Functional Requirements

**Quote capture and calculation**

- **FR-001**: System MUST provide a single-page form capturing customer name,
  age, property type (House, Flat, or Bungalow), property value in pounds,
  postcode, and number of previous claims in the last five years.
- **FR-002**: System MUST validate all submitted details before calculation and
  reject any submission that is incomplete or outside accepted ranges.
- **FR-003**: System MUST calculate a premium as the base premium multiplied by
  the risk multiplier of the resolved band, multiplied by the coverage load
  factor — with all three operands sourced from the rules knowledge base.
- **FR-004**: System MUST return both a monthly and an annual premium.
- **FR-005**: System MUST return a numeric risk score, a resolved risk band, a
  plain-English risk summary, the coverage details, and the list of applied risk
  factors for every successful quote.
- **FR-006**: System MUST classify every quote into exactly one of three risk
  bands — STANDARD, ELEVATED, or HIGH RISK — determined solely by score
  boundaries defined in the rules knowledge base.

**Rules knowledge base**

- **FR-007**: System MUST maintain all risk scoring rules in a structured,
  external, version-controlled rules knowledge base held as a first-class,
  documented artifact — not embedded within product logic and not retrieved from
  a remote service.
- **FR-008**: System MUST evaluate risk by iterating the factors defined in the
  rules knowledge base and testing each factor's condition against the submitted
  details generically, so that the evaluation logic is independent of any
  specific factor.
- **FR-009**: Adding a risk factor, removing a risk factor, altering a factor's
  points, altering a band boundary, altering a band's risk multiplier, altering
  the base premium, or altering the coverage load factor MUST each be achievable
  by editing the rules knowledge base alone, with zero changes to product logic.
- **FR-010**: System MUST support, at minimum, conditions that test a field for
  equality, greater-than, greater-than-or-equal, falling between two bounds, and
  falling outside a range.
- **FR-011**: System MUST support factors whose points accrue per matched
  occurrence as well as factors that contribute a fixed amount once.
- **FR-012**: System MUST validate the rules knowledge base when it is loaded and
  MUST refuse to produce quotes from a rules set that is malformed, references an
  unknown operator, or omits required values.
- **FR-013**: System MUST record a version identifier in the rules knowledge base
  and MUST report the active version in every quote response.
- **FR-014**: System MUST source the human-readable description of every applied
  factor from the rules knowledge base, so that a newly added factor is
  self-describing wherever it is displayed.

**Presentation**

- **FR-015**: Users MUST be able to see the risk band presented as a distinct,
  reusable visual badge that varies by band.
- **FR-016**: System MUST display the applied risk factors using the descriptions
  supplied by the rules knowledge base, without maintaining a separate local copy
  of those descriptions.
- **FR-017**: System MUST indicate when a quote is being calculated and MUST
  prevent duplicate concurrent submissions.
- **FR-018**: System MUST display a clear, human-readable message when validation
  fails or the quoting service is unavailable, and MUST allow retry without a
  page reload.

**Operability**

- **FR-019**: Each of the two services MUST start with a single command, and the
  documented setup MUST bring both services up in five commands or fewer.
- **FR-020**: The quoting calculation MUST be deterministic — identical details
  evaluated against an identical rules knowledge base MUST always produce an
  identical result — and MUST NOT depend on any external or third-party service.
- **FR-021**: Documentation MUST state the location of the rules knowledge base
  file and how to edit it.

### Key Entities

- **Quote Request**: The details a customer submits — name, age, property type,
  property value, postcode, and previous claims count in the last five years.
- **Quote Result**: The outcome returned to the customer — monthly premium,
  annual premium, risk band, risk score, risk summary, coverage details, applied
  factors, and the active rules version.
- **Rules Knowledge Base**: The externally maintained, versioned rules set
  containing the base premium, coverage load factor, risk band definitions with
  their score ranges and risk multipliers, and the collection of risk factors.
- **Risk Factor**: A single named rule within the rules knowledge base — an
  identifier, a human-readable description, a condition to evaluate against the
  quote request, a point value, and whether those points accrue per occurrence.
- **Risk Band**: A named classification with an inclusive score range and an
  associated risk multiplier applied to the base premium.
- **Applied Factor**: A record of a factor that matched a specific quote request,
  carrying its identifier, description, and the points it contributed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can go from an empty form to a displayed premium in
  under 60 seconds without assistance, documentation, or an account.
- **SC-002**: Quotes are returned fast enough to feel instantaneous, with the
  result visible within 2 seconds of submission under normal conditions.
- **SC-003**: A pricing specialist can add a new risk factor and see it applied
  to a matching quote in under 5 minutes, and the resulting change set contains
  edits to the rules knowledge base only.
- **SC-004**: 100% of rule adjustments in the categories listed in FR-009 are
  achievable with zero edits to product logic, verified by inspecting the diff.
- **SC-005**: Every applied risk factor shown to a customer is traceable to a
  named entry in the rules knowledge base, with no factor appearing that is not
  defined there.
- **SC-006**: All three risk bands are reachable and each is covered by at least
  one automated test that asserts the resulting band and premium.
- **SC-007**: 100% of invalid submissions are rejected with a specific message
  identifying the problem, and none produce a premium figure.
- **SC-008**: Identical details evaluated twice against the same rules version
  produce identical premiums on every attempt.
- **SC-009**: A new developer can start both services and obtain a quote in five
  commands or fewer, following the documentation only.

## Assumptions

- **No persistence**: quotes are calculated and returned in the moment; storing
  quote history, retrieving past quotes, and issuing policies are out of scope.
- **No accounts or authentication**: the tool is anonymous and public-facing;
  the customer name is captured for personalisation of the quote, not identity.
- **Single line of business**: home insurance only; no motor, travel, or other
  product lines.
- **Single currency and locale**: pounds sterling and UK postcodes only.
- **Postcode is captured but not scored by default**: it is collected because
  geography-based factors — such as flood-zone prefixes — are an anticipated
  future rules addition, which the rules knowledge base must accommodate without
  product changes.
- **Rules are edited by a trusted operator**: the rules knowledge base is changed
  through the same review process as any other repository artifact; an in-product
  editing interface for rules is out of scope.
- **Rules are loaded at service start**: a rules change takes effect on restart;
  hot-reloading without restart is not required.
- **Estimate, not a binding offer**: the figure is an indicative quote and does
  not constitute an underwriting decision or a contract.
- **Modern browser on desktop or mobile web**: no native application, and no
  support obligation for legacy browsers.
- **Band coverage is exhaustive**: the rules knowledge base defines bands that
  collectively cover every attainable score with no gaps, and the highest band is
  open-ended in effect.
