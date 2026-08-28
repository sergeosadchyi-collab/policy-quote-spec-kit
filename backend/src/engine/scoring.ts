import type { AppliedFactor } from '../api/response-types.ts';
import type { QuoteRequest } from '../api/request-schema.ts';
import type { RiskKnowledgeBase, RiskFactor } from '../kb/kb-schema.ts';
import { evaluateCondition } from './condition-evaluator.ts';

/**
 * Accumulate a risk score by iterating the Knowledge Base generically.
 *
 * There is no per-factor branching anywhere in this file — no `if` on a factor
 * id, no `switch` on a rule type. A factor is data, and this loop is the whole
 * of the scoring logic (Principle I). That is precisely what makes "add a
 * factor by editing the KB" true rather than aspirational.
 */

export interface ScoreResult {
  /** Unrounded sum of the contributions of every applied factor (FR-004b). */
  riskScore: number;
  /** In Knowledge Base declaration order, so two runs list factors identically. */
  appliedFactors: AppliedFactor[];
}

export function scoreRequest(kb: RiskKnowledgeBase, request: QuoteRequest): ScoreResult {
  const appliedFactors: AppliedFactor[] = [];
  let riskScore = 0;

  for (const factor of kb.factors) {
    if (!evaluateCondition(factor.condition, request)) {
      continue;
    }

    // Overlapping factors BOTH apply and are both listed. Mutual exclusivity is
    // the KB author's responsibility: silently dropping one would leave the
    // customer with a score they cannot reconcile against the listed factors.
    const points = contributionOf(factor, request);

    // A zero contribution is omitted rather than listed as "+0". It explains
    // nothing and invites the customer to ask why a factor they were not
    // charged for appears in their breakdown (FR-011).
    if (points === 0) {
      continue;
    }

    riskScore += points;
    appliedFactors.push({
      id: factor.id,
      // Copied verbatim — customer-facing factor text is never authored in code.
      description: factor.description,
      points,
    });
  }

  return { riskScore, appliedFactors };
}

/**
 * A factor contributes either its flat points or its points once per occurrence.
 *
 * The occurrence count comes from the field the KB author explicitly nominated,
 * never from the condition. Load-time validation guarantees `occurrenceField` is
 * present and names a numeric request field whenever `perOccurrence` is set, so
 * the fallbacks here are unreachable backstops rather than working logic.
 */
function contributionOf(factor: RiskFactor, request: QuoteRequest): number {
  if (factor.perOccurrence !== true || factor.occurrenceField === undefined) {
    return factor.points;
  }

  const count = (request as unknown as Record<string, unknown>)[factor.occurrenceField];

  if (typeof count !== 'number' || !Number.isFinite(count)) {
    throw new Error(
      `Factor "${factor.id}" counts occurrences of "${factor.occurrenceField}", ` +
        `which is not a numeric field of the quote request.`,
    );
  }

  return factor.points * count;
}
