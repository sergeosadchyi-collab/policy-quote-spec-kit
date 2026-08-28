import type { QuoteRequest } from '../../src/api/request-schema.ts';

/**
 * A valid, already-normalised quote request that triggers NO factors in the
 * fixture Knowledge Base. Tests override only the fields they care about, so
 * each test reads as a statement about one variable.
 */
export function aRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
  return {
    customerName: 'Alice Fairweather',
    age: 42,
    propertyType: 'House',
    propertyValue: 320000,
    postcode: 'SW1A 1AA',
    previousClaims: 0,
    ...overrides,
  };
}

/** The same values as `aRequest`, as an untyped JSON body for handler tests. */
export function aRequestBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...aRequest(), ...overrides });
}
