import { scoreRequest } from '../../src/engine/scoring.ts';
import { parsedKb } from '../helpers/kb-fixture.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * Per-occurrence scoring: "£15 per claim", not "£15 if you have claimed".
 *
 * The occurrence count comes from an EXPLICITLY nominated field
 * (`occurrenceField`) rather than being inferred from the condition. Inference
 * would be ambiguous the moment a factor's condition is compound — a rule about
 * flats with claims would have no single obvious field to count — so the KB
 * author states it (FR-011).
 */
describe('per-occurrence scoring', () => {
  const perClaimKb = (points: number) =>
    parsedKb((kb) => {
      kb.factors = [
        {
          id: 'per_claim',
          description: 'Each previous claim',
          condition: { field: 'previousClaims', operator: 'gte', value: 1 },
          points,
          perOccurrence: true,
          occurrenceField: 'previousClaims',
        },
      ];
    });

  it('multiplies points by the nominated occurrence field', () => {
    const kb = perClaimKb(5);

    expect(scoreRequest(kb, aRequest({ previousClaims: 1 })).riskScore).toBe(5);
    expect(scoreRequest(kb, aRequest({ previousClaims: 3 })).riskScore).toBe(15);
  });

  it('reports the multiplied total in appliedFactors, not the per-unit rate', () => {
    // The listed points must reconcile against the score the customer is shown;
    // showing "+5" beside a contribution of 15 would be actively misleading.
    const { appliedFactors, riskScore } = scoreRequest(
      perClaimKb(5),
      aRequest({ previousClaims: 4 }),
    );

    expect(appliedFactors).toHaveLength(1);
    expect(appliedFactors[0]?.points).toBe(20);
    expect(appliedFactors.reduce((sum, factor) => sum + factor.points, 0)).toBe(riskScore);
  });

  it('draws the count from the nominated field even when the condition is compound', () => {
    const kb = parsedKb((k) => {
      k.factors = [
        {
          id: 'flat_claims',
          description: 'Claims on a flat',
          condition: {
            all: [
              { field: 'propertyType', operator: 'eq', value: 'Flat' },
              { field: 'previousClaims', operator: 'gte', value: 1 },
            ],
          },
          points: 7,
          perOccurrence: true,
          occurrenceField: 'previousClaims',
        },
      ];
    });

    expect(scoreRequest(kb, aRequest({ propertyType: 'Flat', previousClaims: 2 })).riskScore).toBe(
      14,
    );
    // Condition unmet: the factor does not apply at all, whatever the count.
    expect(scoreRequest(kb, aRequest({ propertyType: 'House', previousClaims: 2 })).riskScore).toBe(
      0,
    );
  });

  it('omits a zero-count factor entirely rather than listing it as "+0"', () => {
    // Reachable when the condition holds but the count is zero — e.g. a rule
    // conditioned on `gte 0`. A "+0" line explains nothing and invites the
    // customer to ask why a factor they were not charged for is listed.
    const kb = parsedKb((k) => {
      k.factors = [
        {
          id: 'per_claim',
          description: 'Each previous claim',
          condition: { field: 'previousClaims', operator: 'gte', value: 0 },
          points: 5,
          perOccurrence: true,
          occurrenceField: 'previousClaims',
        },
      ];
    });

    const { riskScore, appliedFactors } = scoreRequest(kb, aRequest({ previousClaims: 0 }));

    expect(riskScore).toBe(0);
    expect(appliedFactors).toEqual([]);
  });

  it('leaves factors without perOccurrence scoring flat', () => {
    const kb = parsedKb((k) => {
      k.factors = [
        {
          id: 'any_claim',
          description: 'Has claimed before',
          condition: { field: 'previousClaims', operator: 'gte', value: 1 },
          points: 9,
        },
      ];
    });

    expect(scoreRequest(kb, aRequest({ previousClaims: 5 })).riskScore).toBe(9);
  });
});
