import { scoreRequest } from '../../src/engine/scoring.ts';
import { parsedKb } from '../helpers/kb-fixture.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * Scoring iterates the KB generically. No test below names a point value that
 * is also written in the engine — every expectation is derived from the
 * fixture KB, so a scoring constant leaking into code would not make these
 * tests pass (Principle I, Principle VII).
 */
describe('scoreRequest', () => {
  const kb = parsedKb();
  const flatFactor = kb.factors[0];
  const ageFactor = kb.factors[1];

  it('scores zero and applies nothing when no factor matches', () => {
    const result = scoreRequest(kb, aRequest());

    expect(result.riskScore).toBe(0);
    expect(result.appliedFactors).toEqual([]);
  });

  it('accumulates the points of a single matching factor', () => {
    const result = scoreRequest(kb, aRequest({ propertyType: 'Flat' }));

    expect(result.riskScore).toBe(flatFactor?.points);
    expect(result.appliedFactors).toHaveLength(1);
    expect(result.appliedFactors[0]?.id).toBe(flatFactor?.id);
  });

  it('copies the factor description verbatim from the KB', () => {
    const result = scoreRequest(kb, aRequest({ propertyType: 'Flat' }));

    expect(result.appliedFactors[0]?.description).toBe(flatFactor?.description);
  });

  it('applies BOTH of two overlapping factors and lists both', () => {
    // Mutual exclusivity is the KB author's responsibility, not the engine's:
    // silently dropping one would make the score unexplainable.
    const result = scoreRequest(kb, aRequest({ propertyType: 'Flat', age: 80 }));

    expect(result.appliedFactors.map((f) => f.id)).toEqual([flatFactor?.id, ageFactor?.id]);
    expect(result.riskScore).toBe((flatFactor?.points ?? 0) + (ageFactor?.points ?? 0));
  });

  it('lists applied factors in Knowledge Base declaration order', () => {
    const result = scoreRequest(kb, aRequest({ propertyType: 'Flat', age: 80 }));
    const kbOrder = kb.factors.map((f) => f.id);
    const appliedOrder = result.appliedFactors.map((f) => f.id);

    expect(appliedOrder).toEqual(kbOrder.filter((id) => appliedOrder.includes(id)));
  });

  it('reports points that sum exactly to the risk score', () => {
    const result = scoreRequest(kb, aRequest({ propertyType: 'Flat', age: 18 }));
    const sum = result.appliedFactors.reduce((total, factor) => total + factor.points, 0);

    expect(sum).toBe(result.riskScore);
  });

  it('scores zero against a Knowledge Base with no factors at all', () => {
    const emptyKb = parsedKb((mutable) => {
      mutable.factors = [];
    });

    const result = scoreRequest(emptyKb, aRequest({ propertyType: 'Flat', age: 80 }));

    expect(result.riskScore).toBe(0);
    expect(result.appliedFactors).toEqual([]);
  });

  it('honours a negative-points factor as a discount', () => {
    const discountKb = parsedKb((mutable) => {
      mutable.factors = [
        {
          id: 'no_claims_discount',
          description: 'No claims in the last five years',
          condition: { field: 'previousClaims', operator: 'eq', value: 0 },
          points: -8,
        },
      ];
    });

    const result = scoreRequest(discountKb, aRequest({ previousClaims: 0 }));

    expect(result.riskScore).toBe(-8);
    expect(result.appliedFactors[0]?.points).toBe(-8);
  });

  it('does not mutate the Knowledge Base while scoring', () => {
    const snapshot = JSON.stringify(kb);
    scoreRequest(kb, aRequest({ propertyType: 'Flat', age: 80 }));

    expect(JSON.stringify(kb)).toBe(snapshot);
  });
});
