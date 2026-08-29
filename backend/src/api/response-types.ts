/**
 * The shapes the API returns, mirroring `contracts/policy-quote.openapi.yaml`.
 *
 * These are plain types rather than Zod schemas because nothing PARSES a
 * response — the backend constructs it and the frontend consumes it. Defining
 * a schema here would create a second authority with nothing validating
 * against it. A conformance test asserts real responses satisfy the published
 * OpenAPI document.
 */

/** A factor that matched this request (FR-005, FR-016). */
export interface AppliedFactor {
  id: string;
  /** Copied verbatim from the KB — customer-facing factor text is never authored in code. */
  description: string;
  /**
   * Points ACTUALLY contributed, after any per-occurrence multiplication — not
   * the KB's per-unit value. These sum exactly to `riskScore`, so a customer
   * can add up the displayed numbers and reconcile them (SC-005).
   */
  points: number;
}

/** The pricing breakdown behind the premium (FR-005a). Every value is KB-sourced. */
export interface CoverageDetails {
  basePremium: number;
  riskMultiplier: number;
  coverageLoadFactor: number;
  annualPremium: number;
}

/**
 * The successful response payload.
 *
 * Constitution Principle III requires ALL of these fields on every 200. There
 * is no partial success response: a caller that receives a quote receives the
 * complete explanation of it.
 */
export interface QuoteResult {
  monthlyPremium: number;
  annualPremium: number;
  /** Resolved band `id` — the machine key, stable across customer-facing rewording. */
  riskBand: string;
  /** Resolved band `label` — the display string. */
  riskBandLabel: string;
  riskScore: number;
  riskSummary: string;
  coverageDetails: CoverageDetails;
  /** Empty when nothing matched: a valid lowest-band result, not an error. */
  appliedFactors: AppliedFactor[];
  kbVersion: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  error: 'VALIDATION_ERROR';
  message: string;
  issues: ValidationIssue[];
}

export interface ErrorResponse {
  error: string;
  message: string;
}
