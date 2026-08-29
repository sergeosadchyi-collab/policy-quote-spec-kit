import { createQuoteHandler } from '../../src/handler.ts';
import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import { validKbObject, writeKbFile, type MutableKb } from '../helpers/kb-fixture.ts';
import { anEvent, noContext } from '../helpers/event-fixture.ts';
import { aRequestBody } from '../helpers/request-fixture.ts';
import type { QuoteResult } from '../../src/api/response-types.ts';

/**
 * The configurability claim, made falsifiable (SC-003, SC-004).
 *
 * The test loads a KB, then loads the SAME KB with one factor appended, and
 * asserts the new rule takes effect — new description, new score, new band — with
 * no engine code involved and nothing about the new factor known to any module.
 *
 * The appended factor deliberately exercises the User Story 3 capabilities at
 * once: a compound `all` condition over two fields, and the `startsWith`
 * operator. If adding it required an engine change, this test could not pass.
 */
describe('a factor can be added by editing the Knowledge Base alone', () => {
  const quoteFor = async (kbObject: MutableKb, body: string): Promise<QuoteResult> => {
    const kb = loadKnowledgeBase(writeKbFile(kbObject));
    const response = await createQuoteHandler(kb)(anEvent({ body }), noContext);

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as QuoteResult;
  };

  const body = aRequestBody({
    propertyType: 'Flat',
    propertyValue: 640000,
    postcode: 'SW1A 1AA',
  });

  const newFactor = {
    id: 'prime_london_flat',
    description: 'A high-value flat in a prime central London postcode',
    condition: {
      all: [
        { field: 'propertyType', operator: 'eq', value: 'Flat' },
        { field: 'propertyValue', operator: 'gt', value: 500000 },
        { field: 'postcode', operator: 'startsWith', value: 'SW' },
      ],
    },
    points: 30,
  };

  it('applies the new factor, shifts the score and re-bands the customer', async () => {
    const before = await quoteFor(validKbObject(), body);

    const extended = validKbObject();
    extended.factors.push(newFactor);
    const after = await quoteFor(extended, body);

    // The factor is listed, with the KB's wording reproduced verbatim.
    expect(before.appliedFactors.map((f) => f.id)).not.toContain('prime_london_flat');
    const added = after.appliedFactors.find((f) => f.id === 'prime_london_flat');
    expect(added).toBeDefined();
    expect(added?.description).toBe(newFactor.description);
    expect(added?.points).toBe(newFactor.points);

    // The score moves by exactly the declared points, and the premium follows.
    expect(after.riskScore).toBe(before.riskScore + newFactor.points);
    expect(after.riskBand).not.toBe(before.riskBand);
    expect(after.annualPremium).toBeGreaterThan(before.annualPremium);
  });

  it('leaves a non-matching customer completely unaffected by the new factor', async () => {
    // Same KB edit, a customer the rule does not describe: the quote must be
    // byte-identical. A KB change must not perturb unrelated customers.
    const houseBody = aRequestBody({ propertyType: 'House', propertyValue: 640000 });

    const extended = validKbObject();
    extended.factors.push(newFactor);

    const before = await quoteFor(validKbObject(), houseBody);
    const after = await quoteFor(extended, houseBody);

    expect(after).toEqual(before);
  });

  it('reflects a reworded description without any code change', async () => {
    const reworded = validKbObject();
    const target = reworded.factors[0];
    if (target === undefined) throw new Error('fixture must declare at least one factor');
    target['description'] = 'Completely new customer-facing wording';

    const quote = await quoteFor(reworded, aRequestBody({ propertyType: 'Flat' }));

    expect(quote.appliedFactors.map((f) => f.description)).toContain(
      'Completely new customer-facing wording',
    );
  });

  it('re-prices from a changed base premium with no code change', async () => {
    const repriced = validKbObject();
    repriced.basePremium = 500;

    const quote = await quoteFor(repriced, body);

    expect(quote.coverageDetails.basePremium).toBe(500);
  });
});
