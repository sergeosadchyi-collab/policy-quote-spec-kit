import type { Condition } from '../kb/kb-schema.ts';

/**
 * The group combinator lookup table.
 *
 * The same shape as `LEAF_OPERATORS` and for the same reason: adding a
 * combinator is a one-entry table addition, never a new branch in the evaluator
 * (Principle I). `switch` is banned here.
 *
 * Each combinator receives the already-resolved members as a lazily-evaluated
 * predicate list, so `all` and `any` short-circuit — a nested group is not
 * evaluated once an earlier member has already decided the outcome.
 */

export type GroupCombinator = 'all' | 'any' | 'not';

export type CombinatorFn = (members: Condition[], resolve: (member: Condition) => boolean) => boolean;

export const GROUP_COMBINATORS: Readonly<Record<GroupCombinator, CombinatorFn>> = Object.freeze({
  all: (members, resolve) => members.every(resolve),

  any: (members, resolve) => members.some(resolve),

  /**
   * True when NO member matches — i.e. NOT(a OR b), as the published contract
   * defines it (`contracts/risk-kb.schema.json` → groupCondition).
   *
   * Members are non-empty by schema, so the vacuous case cannot arise. The
   * alternative reading, NOT(a AND b), was rejected: it makes `not` mean
   * something subtly different depending on how many members it has, and the
   * contract had already fixed the meaning. For the single-member case — by far
   * the common one — the two readings coincide.
   */
  not: (members, resolve) => !members.some(resolve),
});

export function isGroupCombinator(candidate: string): candidate is GroupCombinator {
  return Object.hasOwn(GROUP_COMBINATORS, candidate);
}

/** Narrows a condition to its group form, returning the combinator key present on it. */
export function groupKeyOf(condition: Condition): GroupCombinator | undefined {
  if (typeof condition !== 'object' || condition === null) {
    return undefined;
  }

  for (const key of Object.keys(GROUP_COMBINATORS) as GroupCombinator[]) {
    if (Object.hasOwn(condition, key)) {
      return key;
    }
  }

  return undefined;
}
