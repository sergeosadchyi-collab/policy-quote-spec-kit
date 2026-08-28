import { createQuoteHandler } from '../../src/handler.ts';
import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import { REQUEST_BOUNDS } from '../../src/api/request-schema.ts';
import { validKbObject, writeKbFile } from '../helpers/kb-fixture.ts';
import { anEvent, noContext } from '../helpers/event-fixture.ts';
import { aRequest } from '../helpers/request-fixture.ts';
import type { ValidationErrorResponse } from '../../src/api/response-types.ts';

/**
 * Invalid input must produce a specific, field-attributed message and NEVER a
 * premium (FR-002a, FR-017, SC-007).
 *
 * The "no premium anywhere" assertion is the important one. A response that
 * reported an error *and* carried a figure would invite a client to render it,
 * and a customer would be shown a price derived from details the system had
 * already judged invalid.
 */
describe('request validation', () => {
  const kb = loadKnowledgeBase(writeKbFile(validKbObject()));
  const handler = createQuoteHandler(kb);

  const post = async (body: string | null, isBase64Encoded = false) => {
    const event = anEvent(body === null ? { body: null } : { body, isBase64Encoded });
    const response = await handler(event, noContext);
    return { response, payload: JSON.parse(response.body) as ValidationErrorResponse };
  };

  const withField = (overrides: Record<string, unknown>) =>
    JSON.stringify({ ...aRequest(), ...overrides });

  const withoutField = (field: string) => {
    const request: Record<string, unknown> = { ...aRequest() };
    delete request[field];
    return JSON.stringify(request);
  };

  describe('rejects each invalid category with a field-specific issue', () => {
    const cases: Array<[string, string, string]> = [
      ['a missing field', withoutField('age'), 'age'],
      ['an empty name', withField({ customerName: '   ' }), 'customerName'],
      [
        'a name over the length limit',
        withField({ customerName: 'x'.repeat(REQUEST_BOUNDS.customerNameMaxLength + 1) }),
        'customerName',
      ],
      ['an age below the minimum', withField({ age: REQUEST_BOUNDS.minAge - 1 }), 'age'],
      ['an age above the maximum', withField({ age: REQUEST_BOUNDS.maxAge + 1 }), 'age'],
      ['a non-integer age', withField({ age: 42.5 }), 'age'],
      ['a negative property value', withField({ propertyValue: -1 }), 'propertyValue'],
      [
        'a property value above the ceiling',
        withField({ propertyValue: REQUEST_BOUNDS.maxPropertyValue + 1 }),
        'propertyValue',
      ],
      ['a negative claim count', withField({ previousClaims: -1 }), 'previousClaims'],
      ['an invalid property type', withField({ propertyType: 'Houseboat' }), 'propertyType'],
      ['a malformed postcode', withField({ postcode: 'NOT A POSTCODE' }), 'postcode'],
    ];

    it.each(cases)('rejects %s', async (_label, body, expectedField) => {
      const { response, payload } = await post(body);

      expect(response.statusCode).toBe(400);
      expect(payload.error).toBe('VALIDATION_ERROR');
      expect(payload.issues.map((issue) => issue.field)).toContain(expectedField);

      const issue = payload.issues.find((candidate) => candidate.field === expectedField);
      expect(issue?.message).toBeTruthy();
      // A message a customer can act on, not a schema dump.
      expect(issue?.message).not.toMatch(/zod|invalid_type|expected .* received/i);
    });

    it.each(cases)('returns no premium figure for %s', async (_label, body) => {
      const { response } = await post(body);

      expect(response.body).not.toMatch(/premium/i);
      expect(response.body).not.toMatch(/riskBand|riskScore|coverageDetails/i);
    });
  });

  describe('rejects unusable bodies without throwing', () => {
    it.each([
      ['a null body', null],
      ['a non-JSON body', 'this is not json'],
      ['a JSON array body', '[]'],
      ['a JSON string body', '"hello"'],
      ['a JSON null body', 'null'],
    ])('rejects %s with 400', async (_label, body) => {
      const { response, payload } = await post(body);

      expect(response.statusCode).toBe(400);
      expect(payload.error).toBe('VALIDATION_ERROR');
      expect(response.body).not.toMatch(/premium/i);
    });

    it('rejects an unknown extra field rather than ignoring it', async () => {
      // A stray field usually means a client is sending something it believes
      // matters. Silently discarding it would hide the mismatch.
      const { response } = await post(withField({ numberOfCats: 3 }));

      expect(response.statusCode).toBe(400);
    });
  });

  it('reports every offending field at once, not just the first', async () => {
    // One round trip should tell the customer everything that is wrong.
    const { payload } = await post(
      withField({ age: 5, postcode: 'XX', propertyType: 'Castle', customerName: '' }),
    );

    const fields = payload.issues.map((issue) => issue.field);
    expect(fields).toEqual(
      expect.arrayContaining(['age', 'postcode', 'propertyType', 'customerName']),
    );
  });

  it('validates a base64-encoded body identically', async () => {
    const encoded = Buffer.from(withField({ age: 5 }), 'utf8').toString('base64');
    const { response, payload } = await post(encoded, true);

    expect(response.statusCode).toBe(400);
    expect(payload.issues.map((issue) => issue.field)).toContain('age');
  });

  it('accepts a valid request that sits exactly on each boundary', async () => {
    // The bounds are inclusive; an off-by-one here would reject a legitimate
    // customer, which is a costlier failure than it looks.
    for (const age of [REQUEST_BOUNDS.minAge, REQUEST_BOUNDS.maxAge]) {
      const response = await handler(anEvent({ body: withField({ age }) }), noContext);
      expect(response.statusCode).toBe(200);
    }
  });
});
