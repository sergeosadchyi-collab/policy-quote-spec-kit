import type { QuoteRequest } from '../api/request-schema.ts';
import type { Condition } from '../kb/kb-schema.ts';
import { LEAF_OPERATORS, isLeafOperator, type LeafOperands } from './operators.ts';
import { GROUP_COMBINATORS, groupKeyOf, type GroupCombinator } from './combinators.ts';

/**
 * The single entry point through which EVERY condition is resolved (FR-010b).
 *
 * Because leaves and (from User Story 3) arbitrarily nested groups take the
 * identical code path, a factor of any structural complexity is a KB-only
 * addition. This module knows nothing about points, bands or premiums.
 */

export class ConditionEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConditionEvaluationError';
  }
}

/**
 * Anything unresolvable RAISES rather than evaluating to `false`.
 *
 * A silent `false` would mean a rule that never fires, a premium that is quietly
 * too low, and no signal anywhere that something is wrong. Load-time validation
 * is what makes these paths unreachable in practice; this is the backstop that
 * makes a gap in that validation loud instead of invisible.
 *
 * Groups and leaves resolve through the SAME entry point, so nesting depth is
 * not a special case anywhere (FR-010b).
 */
export function evaluateCondition(condition: Condition, request: QuoteRequest): boolean {
  const groupKey = groupKeyOf(condition);

  if (groupKey !== undefined) {
    const members = (condition as Record<GroupCombinator, Condition[]>)[groupKey];

    if (!Array.isArray(members) || members.length === 0) {
      throw new ConditionEvaluationError(
        `Group condition "${groupKey}" must contain at least one member condition.`,
      );
    }

    return GROUP_COMBINATORS[groupKey](members, (member) => evaluateCondition(member, request));
  }

  if (!isLeafShaped(condition)) {
    throw new ConditionEvaluationError(
      `Condition is neither a leaf comparison nor a recognised group: ${JSON.stringify(condition)}`,
    );
  }

  const { field, operator } = condition;

  if (!isLeafOperator(operator)) {
    throw new ConditionEvaluationError(
      `Unknown condition operator "${operator}" on field "${field}". ` +
        `Known operators: ${Object.keys(LEAF_OPERATORS).join(', ')}.`,
    );
  }

  if (!Object.hasOwn(request, field)) {
    throw new ConditionEvaluationError(
      `Condition references "${field}", which is not a field of the quote request. ` +
        `Known fields: ${Object.keys(request).join(', ')}.`,
    );
  }

  const actual = (request as unknown as Record<string, unknown>)[field];

  return LEAF_OPERATORS[operator](actual, condition as LeafOperands);
}

function isLeafShaped(candidate: unknown): candidate is { field: string; operator: string } {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'field' in candidate &&
    'operator' in candidate &&
    typeof (candidate as { field: unknown }).field === 'string' &&
    typeof (candidate as { operator: unknown }).operator === 'string'
  );
}
