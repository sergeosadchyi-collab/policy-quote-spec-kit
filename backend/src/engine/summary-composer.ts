import type { QuoteRequest } from '../api/request-schema.ts';
import type { AppliedFactor } from '../api/response-types.ts';
import type { RiskBand } from '../kb/kb-schema.ts';
import {
  isSummaryPlaceholder,
  placeholderPattern,
  type SummaryPlaceholder,
} from './summary-placeholders.ts';

/**
 * Compose the customer-facing risk explanation.
 *
 * **No risk prose is authored here** (FR-014a). Every sentence a customer reads
 * comes from the resolved band's KB `summaryTemplate` and from the KB
 * descriptions of the factors that applied. This module only substitutes and
 * joins — which is exactly why rewording an explanation is a KB edit.
 */

export class SummaryCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SummaryCompositionError';
  }
}

export interface SummaryInput {
  band: RiskBand;
  request: QuoteRequest;
  riskScore: number;
  annualPremium: number;
  monthlyPremium: number;
  appliedFactors: readonly AppliedFactor[];
}

/**
 * The only text this module contributes: a structural label introducing the
 * KB's own factor descriptions. It carries no risk judgement of its own.
 */
const FACTOR_LIST_LABEL = 'Factors applied:';

export function composeSummary(input: SummaryInput): string {
  const substituted = substitute(input.band.summaryTemplate, resolveValues(input));

  if (input.appliedFactors.length === 0) {
    // Nothing is appended and no explanation is invented for the absence: the
    // band template already has {{appliedFactorCount}} if it wants to say so.
    return substituted;
  }

  const descriptions = input.appliedFactors.map((factor) => factor.description).join('; ');

  return `${substituted} ${FACTOR_LIST_LABEL} ${descriptions}.`;
}

function resolveValues(input: SummaryInput): Record<SummaryPlaceholder, string> {
  return {
    customerName: input.request.customerName,
    riskScore: String(input.riskScore),
    riskBandLabel: input.band.label,
    annualPremium: input.annualPremium.toFixed(2),
    monthlyPremium: input.monthlyPremium.toFixed(2),
    appliedFactorCount: String(input.appliedFactors.length),
    propertyType: input.request.propertyType,
  };
}

function substitute(template: string, values: Record<SummaryPlaceholder, string>): string {
  return template.replace(placeholderPattern(), (_match, rawToken: string) => {
    const token = rawToken.trim();

    if (!isSummaryPlaceholder(token)) {
      // Raising beats substituting empty text: a customer must never be shown a
      // sentence with a hole in it, or a literal `{{typo}}` (FR-014b).
      throw new SummaryCompositionError(
        `Summary template uses unknown placeholder "{{${token}}}". ` +
          `The engine can only substitute its published placeholder set.`,
      );
    }

    return values[token];
  });
}
