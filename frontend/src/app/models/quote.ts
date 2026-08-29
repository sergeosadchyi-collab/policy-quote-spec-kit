/**
 * Types mirroring the API contract (`contracts/policy-quote.openapi.yaml`).
 *
 * The frontend holds NO copy of any risk rule, band boundary, factor
 * description or scoring value — only the shape of the message. Every piece of
 * customer-facing risk text arrives from the backend, which in turn takes it
 * verbatim from the Knowledge Base (FR-014a, FR-016).
 *
 * `riskBand` is deliberately a plain `string`, not a union of three literals:
 * bands are KB-defined, so adding one must not require a frontend change.
 */

export type PropertyType = 'House' | 'Flat' | 'Bungalow';

export interface QuoteRequest {
  customerName: string;
  age: number;
  propertyType: PropertyType;
  propertyValue: number;
  postcode: string;
  previousClaims: number;
}

export interface AppliedFactor {
  id: string;
  /** Rendered verbatim. The frontend never maps an id to its own text. */
  description: string;
  /** Points actually contributed; these sum exactly to `riskScore`. */
  points: number;
}

export interface CoverageDetails {
  basePremium: number;
  riskMultiplier: number;
  coverageLoadFactor: number;
  annualPremium: number;
}

export interface QuoteResult {
  monthlyPremium: number;
  annualPremium: number;
  /** Machine identifier — the badge's styling hook. */
  riskBand: string;
  /** Customer-facing text for the band. */
  riskBandLabel: string;
  riskScore: number;
  riskSummary: string;
  coverageDetails: CoverageDetails;
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
