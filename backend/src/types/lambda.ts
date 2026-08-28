/**
 * Transport-shaped types for the Lambda-compatible handler.
 *
 * These are deliberately a NARROW subset of the API Gateway proxy event: the
 * handler reads only these fields, so declaring more would couple it to data it
 * ignores and make it harder to invoke directly from a test
 * (contracts/lambda-handler.md §1).
 */

export interface QuoteApiEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

/**
 * The handler MUST NOT require any context field in order to produce a correct
 * quote — every field is optional so tests can pass an empty stub.
 */
export interface QuoteApiContext {
  awsRequestId?: string;
  functionName?: string;
}

export interface QuoteApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export type QuoteHandler = (
  event: QuoteApiEvent,
  context: QuoteApiContext,
) => Promise<QuoteApiResponse>;
