import type { CoverageDetails } from '../api/response-types.ts';
import type { RiskBand, RiskKnowledgeBase } from '../kb/kb-schema.ts';
import { floorToPence, roundToPence } from './money.ts';

/**
 * The premium formula (FR-003) and its two — and only two — rounding points
 * (FR-004b).
 *
 * All three operands come from the Knowledge Base. There is no number in this
 * file that affects a price.
 */

export interface PremiumBreakdown {
  annualPremium: number;
  monthlyPremium: number;
  coverageDetails: CoverageDetails;
}

export function calculatePremium(kb: RiskKnowledgeBase, band: RiskBand): PremiumBreakdown {
  // The product is NOT rounded before this point: rounding the intermediate
  // would make the result depend on the order of multiplication (FR-004b).
  const annualPremium = roundToPence(kb.basePremium * band.riskMultiplier * kb.coverageLoadFactor);

  // Derived from the ALREADY-ROUNDED annual figure, which is authoritative
  // (FR-004a), and rounded DOWN so twelve instalments can never overshoot it.
  const monthlyPremium = floorToPence(annualPremium / 12);

  return {
    annualPremium,
    monthlyPremium,
    coverageDetails: {
      basePremium: kb.basePremium,
      riskMultiplier: band.riskMultiplier,
      coverageLoadFactor: kb.coverageLoadFactor,
      annualPremium,
    },
  };
}
