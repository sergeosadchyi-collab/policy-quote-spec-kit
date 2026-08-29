import type { QuoteApiContext, QuoteApiEvent } from '../../src/types/lambda.ts';

/** A constructed API Gateway-shaped event. Handler tests never start an HTTP server. */
export function anEvent(overrides: Partial<QuoteApiEvent> = {}): QuoteApiEvent {
  return {
    httpMethod: 'POST',
    path: '/policy/quote',
    headers: { 'content-type': 'application/json' },
    body: null,
    ...overrides,
  };
}

/**
 * An EMPTY context. The handler must not require any context field to produce
 * a correct quote (contracts/lambda-handler.md §1), and passing `{}` is how
 * that obligation is actually enforced.
 */
export const noContext: QuoteApiContext = {};
