import { LEAF_OPERATORS, type LeafOperator } from '../../src/engine/operators.ts';

/**
 * Every leaf operator, with particular attention to the bounds — an off-by-one
 * at a band-adjacent boundary changes a customer's premium.
 */
describe('LEAF_OPERATORS', () => {
  it('is a frozen lookup table, not a switch', () => {
    expect(Object.isFrozen(LEAF_OPERATORS)).toBe(true);
  });

  it('exposes exactly the operators the published contract declares', () => {
    expect(Object.keys(LEAF_OPERATORS).sort()).toEqual(
      ['between', 'eq', 'gt', 'gte', 'outside range', 'startsWith'].sort(),
    );
  });

  const apply = (
    operator: LeafOperator,
    actual: unknown,
    operands: { value?: string | number | boolean; min?: number; max?: number },
  ): boolean => LEAF_OPERATORS[operator](actual, operands);

  describe('eq', () => {
    it('matches identical values', () => {
      expect(apply('eq', 'Flat', { value: 'Flat' })).toBe(true);
      expect(apply('eq', 3, { value: 3 })).toBe(true);
    });

    it('is strict — no type coercion', () => {
      expect(apply('eq', '3', { value: 3 })).toBe(false);
      expect(apply('eq', 'flat', { value: 'Flat' })).toBe(false);
    });
  });

  describe('gt', () => {
    it('excludes the boundary', () => {
      expect(apply('gt', 500001, { value: 500000 })).toBe(true);
      expect(apply('gt', 500000, { value: 500000 })).toBe(false);
      expect(apply('gt', 499999, { value: 500000 })).toBe(false);
    });
  });

  describe('gte', () => {
    it('includes the boundary', () => {
      expect(apply('gte', 1, { value: 1 })).toBe(true);
      expect(apply('gte', 2, { value: 1 })).toBe(true);
      expect(apply('gte', 0, { value: 1 })).toBe(false);
    });
  });

  describe('between', () => {
    it('is inclusive at BOTH bounds', () => {
      expect(apply('between', 1, { min: 1, max: 2 })).toBe(true);
      expect(apply('between', 2, { min: 1, max: 2 })).toBe(true);
    });

    it('excludes values outside the bounds', () => {
      expect(apply('between', 0, { min: 1, max: 2 })).toBe(false);
      expect(apply('between', 3, { min: 1, max: 2 })).toBe(false);
    });
  });

  describe('outside range', () => {
    it('is the exact complement of between at the bounds', () => {
      expect(apply('outside range', 25, { min: 25, max: 75 })).toBe(false);
      expect(apply('outside range', 75, { min: 25, max: 75 })).toBe(false);
      expect(apply('outside range', 24, { min: 25, max: 75 })).toBe(true);
      expect(apply('outside range', 76, { min: 25, max: 75 })).toBe(true);
    });

    it('never agrees with between for the same operands', () => {
      for (let value = 20; value <= 80; value += 1) {
        expect(apply('outside range', value, { min: 25, max: 75 })).toBe(
          !apply('between', value, { min: 25, max: 75 }),
        );
      }
    });
  });

  describe('numeric operators against a non-numeric value', () => {
    it('does not match, rather than coercing a string into a number', () => {
      // Reachability is prevented at load time by field validation; the
      // behaviour is pinned here so a KB typo can never inflate a premium.
      expect(apply('gt', 'House', { value: 5 })).toBe(false);
      expect(apply('between', 'House', { min: 0, max: 10 })).toBe(false);
      expect(apply('outside range', 'House', { min: 0, max: 10 })).toBe(false);
    });
  });
});
