import { evaluateCondition } from '../../src/engine/condition-evaluator.ts';
import { conditionSchema } from '../../src/kb/kb-schema.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * Group combinators are what turn the KB from a flat list of independent rules
 * into something a pricing specialist can actually express underwriting policy
 * in. The brief's own example — "Flat AND worth over £500,000" — is impossible
 * with leaves alone, and must remain a KB-only change (FR-010a, FR-010b).
 *
 * Every condition here is taken through the real schema before evaluation, so a
 * structure the loader would reject cannot be used to claim engine support.
 */
describe('group combinators', () => {
  const parse = (condition: unknown) => conditionSchema.parse(condition);

  const flat = { field: 'propertyType', operator: 'eq', value: 'Flat' };
  const expensive = { field: 'propertyValue', operator: 'gt', value: 500000 };

  describe('all', () => {
    it("matches the brief's 'Flat AND over £500k' only when both hold", () => {
      const condition = parse({ all: [flat, expensive] });

      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'Flat', propertyValue: 620000 })),
      ).toBe(true);
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'Flat', propertyValue: 300000 })),
      ).toBe(false);
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'House', propertyValue: 620000 })),
      ).toBe(false);
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'House', propertyValue: 300000 })),
      ).toBe(false);
    });
  });

  describe('any', () => {
    it('matches when at least one member holds', () => {
      const condition = parse({ any: [flat, expensive] });

      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'Flat', propertyValue: 300000 })),
      ).toBe(true);
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'House', propertyValue: 620000 })),
      ).toBe(true);
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'House', propertyValue: 300000 })),
      ).toBe(false);
    });
  });

  describe('not', () => {
    it('inverts its members', () => {
      const condition = parse({ not: [flat] });

      expect(evaluateCondition(condition, aRequest({ propertyType: 'Flat' }))).toBe(false);
      expect(evaluateCondition(condition, aRequest({ propertyType: 'House' }))).toBe(true);
    });

    it('is true only when NO member matches, as the published contract defines it', () => {
      // The contract fixes `not` as NOR — true when no child matches — rather
      // than NOT(a AND b). The two readings coincide for a single member and
      // diverge here, so this test pins the published meaning.
      const condition = parse({ not: [flat, expensive] });

      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'Flat', propertyValue: 620000 })),
      ).toBe(false);
      // One member matches, so it is not true that NO member matches.
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'Flat', propertyValue: 300000 })),
      ).toBe(false);
      // Neither matches.
      expect(
        evaluateCondition(condition, aRequest({ propertyType: 'House', propertyValue: 300000 })),
      ).toBe(true);
    });
  });

  describe('nesting', () => {
    it('resolves groups nested several levels deep', () => {
      // (Flat OR Bungalow) AND expensive AND NOT (claims >= 1)
      const condition = parse({
        all: [
          {
            any: [flat, { field: 'propertyType', operator: 'eq', value: 'Bungalow' }],
          },
          expensive,
          { not: [{ field: 'previousClaims', operator: 'gte', value: 1 }] },
        ],
      });

      expect(
        evaluateCondition(
          condition,
          aRequest({ propertyType: 'Bungalow', propertyValue: 700000, previousClaims: 0 }),
        ),
      ).toBe(true);

      // Same profile, but a claim on record defeats the `not`.
      expect(
        evaluateCondition(
          condition,
          aRequest({ propertyType: 'Bungalow', propertyValue: 700000, previousClaims: 2 }),
        ),
      ).toBe(false);

      // Same profile, but a property type outside the inner `any`.
      expect(
        evaluateCondition(
          condition,
          aRequest({ propertyType: 'House', propertyValue: 700000, previousClaims: 0 }),
        ),
      ).toBe(false);
    });

    it('treats a leaf and a group as interchangeable at every position', () => {
      // A group wrapping a single leaf must behave exactly like the bare leaf.
      const bare = parse(flat);
      const wrapped = parse({ all: [{ any: [{ all: [flat] }] }] });
      const request = aRequest({ propertyType: 'Flat' });

      expect(evaluateCondition(wrapped, request)).toBe(evaluateCondition(bare, request));
    });
  });
});
