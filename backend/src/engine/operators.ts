/**
 * The leaf operator lookup table.
 *
 * A frozen `Record`, deliberately NOT a `switch` (Principle I). Adding an
 * operator is a one-entry table addition with a test, and the evaluator that
 * dispatches through it never grows a branch. This module knows nothing about
 * factors, points or bands — only how to compare one value with some operands.
 */

export type LeafOperator = 'eq' | 'gt' | 'gte' | 'between' | 'outside range' | 'startsWith';

/**
 * The operand slots an operator may read. Which slots are actually present is
 * enforced PER OPERATOR by the KB schema, so a `between` condition can never
 * reach here missing its bounds.
 */
export interface LeafOperands {
  value?: string | number | boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

export type LeafOperatorFn = (actual: unknown, operands: LeafOperands) => boolean;

const isNumber = (candidate: unknown): candidate is number =>
  typeof candidate === 'number' && Number.isFinite(candidate);

/**
 * Ordering operators require a numeric subject.
 *
 * A non-numeric subject yields `false` rather than a coerced comparison:
 * `'House' > 5` is meaningless, and coercion could quietly inflate a premium.
 * The case is unreachable through a validated KB — load-time field validation
 * rejects it — but the behaviour is pinned so that it stays harmless.
 */
export const LEAF_OPERATORS: Readonly<Record<LeafOperator, LeafOperatorFn>> = Object.freeze({
  /** Strict equality: no type coercion, so `'3'` never matches `3`. */
  eq: (actual, { value }) => actual === value,

  gt: (actual, { value }) => isNumber(actual) && isNumber(value) && actual > value,

  gte: (actual, { value }) => isNumber(actual) && isNumber(value) && actual >= value,

  /** Inclusive at BOTH bounds. */
  between: (actual, { min, max }) =>
    isNumber(actual) && isNumber(min) && isNumber(max) && actual >= min && actual <= max,

  /** The exact complement of `between` for numeric subjects. */
  'outside range': (actual, { min, max }) =>
    isNumber(actual) && isNumber(min) && isNumber(max) && (actual < min || actual > max),

  /**
   * Prefix match, for postcode-area rules such as "anything starting M1".
   *
   * Case-sensitive against the already-normalised request value: the postcode is
   * upper-cased during request validation, so normalising again here would mask
   * a regression in that normalisation. Non-string subject or operand yields
   * `false` rather than a stringified comparison.
   */
  startsWith: (actual, { value }) =>
    typeof actual === 'string' && typeof value === 'string' && actual.startsWith(value),
});

export function isLeafOperator(candidate: string): candidate is LeafOperator {
  return Object.hasOwn(LEAF_OPERATORS, candidate);
}
