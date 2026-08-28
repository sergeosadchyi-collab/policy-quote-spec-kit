import { LEAF_OPERATORS } from '../../src/engine/operators.ts';
import { evaluateCondition } from '../../src/engine/condition-evaluator.ts';
import { conditionSchema } from '../../src/kb/kb-schema.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * `startsWith` exists so a pricing specialist can write postcode-area rules
 * ("anything in M1…") without the KB needing a regex facility. Principle VII
 * requires a new operator to arrive with evaluator tests, which is what this is.
 */
describe('startsWith operator', () => {
  const startsWith = LEAF_OPERATORS.startsWith;

  it('matches on a leading substring', () => {
    expect(startsWith('SW1A 1AA', { value: 'SW' })).toBe(true);
    expect(startsWith('SW1A 1AA', { value: 'SW1A' })).toBe(true);
    expect(startsWith('SW1A 1AA', { value: 'M1' })).toBe(false);
  });

  it('is case-sensitive against the already-normalised value', () => {
    // Postcodes are upper-cased during request validation, so the operator does
    // not normalise again. Doing so here would hide a normalisation regression.
    expect(startsWith('SW1A 1AA', { value: 'sw' })).toBe(false);
  });

  it('matches everything on an empty prefix and itself on a full match', () => {
    expect(startsWith('SW1A 1AA', { value: '' })).toBe(true);
    expect(startsWith('SW1A 1AA', { value: 'SW1A 1AA' })).toBe(true);
  });

  it('returns false rather than coercing a non-string subject or operand', () => {
    expect(startsWith(12345, { value: '12' })).toBe(false);
    expect(startsWith('SW1A 1AA', { value: 5 })).toBe(false);
    expect(startsWith(undefined, { value: 'SW' })).toBe(false);
  });

  it('works end to end through a schema-parsed condition', () => {
    const condition = conditionSchema.parse({
      field: 'postcode',
      operator: 'startsWith',
      value: 'SW',
    });

    expect(evaluateCondition(condition, aRequest({ postcode: 'SW1A 1AA' }))).toBe(true);
    expect(evaluateCondition(condition, aRequest({ postcode: 'M1 1AE' }))).toBe(false);
  });
});
