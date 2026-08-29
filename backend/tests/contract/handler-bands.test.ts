import { createQuoteHandler, KB_FILE_PATH } from '../../src/handler.ts';
import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import type { QuoteResult } from '../../src/api/response-types.ts';
import { anEvent, noContext } from '../helpers/event-fixture.ts';
import { aRequestBody } from '../helpers/request-fixture.ts';

/**
 * The handler is exercised DIRECTLY with constructed events — no HTTP server is
 * started anywhere in this suite. If a behaviour could only be reached through
 * the server, it would be in the wrong layer (contracts/lambda-handler.md §2).
 *
 * Every expectation is derived from the loaded Knowledge Base. No premium,
 * score, band boundary or factor description is restated as a literal, so a
 * scoring value hardcoded in the engine could not make these tests pass
 * (Principle I, Principle VII).
 */
describe('POST /policy/quote — successful quotes', () => {
  const kb = loadKnowledgeBase(KB_FILE_PATH);
  const handler = createQuoteHandler(kb);

  /** One profile per band, ordered from benign to severe. */
  const profiles: ReadonlyArray<readonly [string, string]> = [
    ['a profile matching no factors', aRequestBody()],
    ['a profile matching some factors', aRequestBody({ propertyType: 'Flat', age: 22 })],
    [
      'a profile matching every factor',
      aRequestBody({ propertyType: 'Flat', age: 80, propertyValue: 820000, previousClaims: 3 }),
    ],
  ];

  async function quoteFor(body: string): Promise<QuoteResult> {
    const response = await handler(anEvent({ body }), noContext);
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toMatch(/application\/json/);
    return JSON.parse(response.body) as QuoteResult;
  }

  describe.each(profiles)('%s', (_label, body) => {
    it('returns every field the response contract requires', async () => {
      const quote = await quoteFor(body);

      // Principle III admits no partial success response: a caller that gets a
      // quote gets the complete explanation of it.
      expect(Object.keys(quote).sort()).toEqual(
        [
          'annualPremium',
          'appliedFactors',
          'coverageDetails',
          'kbVersion',
          'monthlyPremium',
          'riskBand',
          'riskBandLabel',
          'riskScore',
          'riskSummary',
        ].sort(),
      );
      expect(Object.keys(quote.coverageDetails).sort()).toEqual(
        ['annualPremium', 'basePremium', 'coverageLoadFactor', 'riskMultiplier'].sort(),
      );
    });

    it('reports the active Knowledge Base version', async () => {
      expect((await quoteFor(body)).kbVersion).toBe(kb.version);
    });

    it('resolves a band that the Knowledge Base actually declares', async () => {
      const quote = await quoteFor(body);
      const band = kb.riskBands.find((candidate) => candidate.id === quote.riskBand);

      expect(band).toBeDefined();
      expect(quote.riskBandLabel).toBe(band?.label);
      expect(quote.riskScore).toBeGreaterThanOrEqual(band?.min ?? 0);
      expect(quote.riskScore).toBeLessThanOrEqual(band?.max ?? 0);
    });

    it('lists applied factors whose points sum exactly to the risk score', async () => {
      const quote = await quoteFor(body);
      const sum = quote.appliedFactors.reduce((total, factor) => total + factor.points, 0);

      expect(sum).toBe(quote.riskScore);
    });

    it('takes every applied factor id and description verbatim from the KB', async () => {
      const quote = await quoteFor(body);

      for (const applied of quote.appliedFactors) {
        const source = kb.factors.find((factor) => factor.id === applied.id);

        expect(source).toBeDefined();
        expect(applied.description).toBe(source?.description);
      }
    });

    it('prices from the resolved band with no rounding of intermediate values', async () => {
      const quote = await quoteFor(body);
      const band = kb.riskBands.find((candidate) => candidate.id === quote.riskBand);

      expect(quote.coverageDetails.basePremium).toBe(kb.basePremium);
      expect(quote.coverageDetails.coverageLoadFactor).toBe(kb.coverageLoadFactor);
      expect(quote.coverageDetails.riskMultiplier).toBe(band?.riskMultiplier);
      expect(quote.coverageDetails.annualPremium).toBe(quote.annualPremium);
      expect(quote.annualPremium).toBeCloseTo(
        kb.basePremium * (band?.riskMultiplier ?? 0) * kb.coverageLoadFactor,
        2,
      );
    });

    it('keeps twelve instalments within the annual premium', async () => {
      const quote = await quoteFor(body);

      expect(quote.monthlyPremium * 12).toBeLessThanOrEqual(quote.annualPremium + 1e-9);
    });

    it('composes a summary from the resolved band template, with no stray placeholder', async () => {
      const quote = await quoteFor(body);

      expect(quote.riskSummary.length).toBeGreaterThan(0);
      expect(quote.riskSummary).not.toContain('{{');
      expect(quote.riskSummary).toContain('Alice Fairweather');
    });
  });

  it('exercises every band the Knowledge Base declares (SC-006)', async () => {
    const resolved = new Set<string>();
    for (const [, body] of profiles) {
      resolved.add((await quoteFor(body)).riskBand);
    }

    expect([...resolved].sort()).toEqual(kb.riskBands.map((band) => band.id).sort());
  });

  it('returns an empty applied-factor list — not an error — when nothing matches', async () => {
    const quote = await quoteFor(aRequestBody());

    expect(quote.appliedFactors).toEqual([]);
    expect(quote.riskScore).toBe(0);
  });

  it('normalises the postcode before it reaches the engine', async () => {
    const quote = await quoteFor(aRequestBody({ postcode: '  sw1a 1aa  ' }));

    expect(quote.riskScore).toBe(0);
    expect(quote.annualPremium).toBeGreaterThan(0);
  });

  it('rejects any method other than POST', async () => {
    for (const httpMethod of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const response = await handler(anEvent({ httpMethod, body: aRequestBody() }), noContext);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body)).toMatchObject({ error: 'METHOD_NOT_ALLOWED' });
    }
  });

  it('accepts a base64-encoded body, as an API Gateway deployment would send', async () => {
    const response = await handler(
      anEvent({
        body: Buffer.from(aRequestBody(), 'utf8').toString('base64'),
        isBase64Encoded: true,
      }),
      noContext,
    );

    expect(response.statusCode).toBe(200);
  });
});
