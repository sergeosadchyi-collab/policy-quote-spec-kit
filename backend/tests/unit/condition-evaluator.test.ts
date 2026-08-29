import {
  ConditionEvaluationError,
  evaluateCondition,
} from '../../src/engine/condition-evaluator.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * The evaluator is the single entry point through which every condition is
 * resolved (FR-010b). Principle IV requires it to be independently testable —
 * that is what this suite exercises, with no KB and no scoring involved.
 */
describe('evaluateCondition', () => {
  const request = aRequest({ age: 30, propertyType: 'Flat', propertyValue: 600000 });

  it('dispatches an equality leaf through the operator table', () => {
    expect(
      evaluateCondition({ field: 'propertyType', operator: 'eq', value: 'Flat' }, request),
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'propertyType', operator: 'eq', value: 'House' }, request),
    ).toBe(false);
  });

  it('dispatches a comparison leaf', () => {
    expect(
      evaluateCondition({ field: 'propertyValue', operator: 'gt', value: 500000 }, request),
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'propertyValue', operator: 'gt', value: 700000 }, request),
    ).toBe(false);
  });

  it('dispatches a range leaf', () => {
    expect(
      evaluateCondition({ field: 'age', operator: 'outside range', min: 25, max: 75 }, request),
    ).toBe(false);
    expect(
      evaluateCondition({ field: 'age', operator: 'between', min: 25, max: 75 }, request),
    ).toBe(true);
  });

  it('reads every quote-request field generically, with no per-field branching', () => {
    const named = aRequest({ customerName: 'Zoë', previousClaims: 4, postcode: 'EX4 4QJ' });

    expect(evaluateCondition({ field: 'customerName', operator: 'eq', value: 'Zoë' }, named)).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'previousClaims', operator: 'gte', value: 4 }, named)).toBe(
      true,
    );
    expect(evaluateCondition({ field: 'postcode', operator: 'eq', value: 'EX4 4QJ' }, named)).toBe(
      true,
    );
  });

  describe('rejects rather than silently evaluating false', () => {
    it('throws on a field that is not part of the quote request', () => {
      expect(() =>
        evaluateCondition({ field: 'floodZone', operator: 'eq', value: true }, request),
      ).toThrow(ConditionEvaluationError);

      expect(() =>
        evaluateCondition({ field: 'floodZone', operator: 'eq', value: true }, request),
      ).toThrow(/floodZone/);
    });

    it('throws on an operator that is not in the operator table', () => {
      // Unreachable through a validated KB; pinned because a silent `false`
      // here would under-price without any signal that a rule never fired.
      const rogue = { field: 'age', operator: 'approximately', value: 30 } as never;

      expect(() => evaluateCondition(rogue, request)).toThrow(ConditionEvaluationError);
      expect(() => evaluateCondition(rogue, request)).toThrow(/approximately/);
    });

    it('throws on a condition that is neither a leaf nor a recognised structure', () => {
      expect(() => evaluateCondition({} as never, request)).toThrow(ConditionEvaluationError);
    });
  });
});
