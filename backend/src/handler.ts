import { fileURLToPath } from 'node:url';

import { quoteRequestSchema } from './api/request-schema.ts';
import { bodyValidationError, toValidationErrorResponse } from './api/error-mapping.ts';
import { resolveBand } from './engine/band-resolver.ts';
import { calculatePremium } from './engine/premium-calculator.ts';
import { scoreRequest } from './engine/scoring.ts';
import { composeSummary } from './engine/summary-composer.ts';
import { loadKnowledgeBase } from './kb/kb-loader.ts';
import type { RiskKnowledgeBase } from './kb/kb-schema.ts';
import type { ErrorResponse, QuoteResult, ValidationErrorResponse } from './api/response-types.ts';
import type {
  QuoteApiContext,
  QuoteApiEvent,
  QuoteApiResponse,
  QuoteHandler,
} from './types/lambda.ts';

/**
 * The Lambda-compatible core of the backend (Constitution Principle III).
 *
 * Behavioural obligations, all verified by the contract tests:
 *
 *  - **Never throws.** Every failure path returns a structured response, which
 *    is what allows the HTTP adapter to have no error branch at all.
 *  - **Parses defensively.** `event.body` is `unknown` until Zod has seen it.
 *  - **Deterministic.** No clock, randomness, environment lookup or network
 *    call participates in producing the body (Principle V, FR-020).
 *  - **Stateless per invocation.** The only cross-invocation state is the
 *    immutable, already-validated KB.
 *
 * Method and path checking live HERE rather than in the adapter so that
 * behaviour is identical whether the function is invoked over HTTP or called
 * directly by a test with a constructed event.
 */

const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
};

/** The KB is a first-class root artifact, not a source file (research R12). */
export const KB_FILE_PATH = fileURLToPath(new URL('../../risk-kb.json', import.meta.url));

/**
 * Builds a handler bound to a specific Knowledge Base.
 *
 * The KB is injected rather than imported so that a test can exercise the whole
 * pipeline against a fixture — which is what makes "adding a factor is a
 * KB-only change" a provable claim rather than an assertion (SC-003).
 */
export function createQuoteHandler(kb: RiskKnowledgeBase): QuoteHandler {
  return async function handler(
    event: QuoteApiEvent,
    _context: QuoteApiContext,
  ): Promise<QuoteApiResponse> {
    try {
      if (event.httpMethod.toUpperCase() !== 'POST') {
        return errorResponse(405, {
          error: 'METHOD_NOT_ALLOWED',
          message: `Only POST is accepted on ${event.path}.`,
        });
      }

      return await produceQuote(kb, event);
    } catch (cause: unknown) {
      // Reaching here means a genuine defect. It still leaves as a structured
      // body: an unhandled throw would surface as a bare socket error with no
      // usable message for the caller.
      process.stderr.write(
        `[handler] unexpected fault: ${cause instanceof Error ? cause.stack : String(cause)}\n`,
      );
      return errorResponse(500, {
        error: 'INTERNAL_ERROR',
        message: 'The quote could not be calculated because of an unexpected error.',
      });
    }
  };
}

/**
 * The quote pipeline.
 *
 * Ordering is forced by the data: a summary template may reference the premium,
 * the premium needs the band, and the band needs the score. Composition is
 * therefore necessarily last (data-model.md §9).
 */
async function produceQuote(
  kb: RiskKnowledgeBase,
  event: QuoteApiEvent,
): Promise<QuoteApiResponse> {
  const decoded = decodeBody(event);

  if (!decoded.ok) {
    return errorResponse(400, bodyValidationError(decoded.message));
  }

  const parsed = quoteRequestSchema.safeParse(decoded.value);
  if (!parsed.success) {
    return errorResponse(400, toValidationErrorResponse(parsed.error));
  }

  const request = parsed.data;
  const { riskScore, appliedFactors } = scoreRequest(kb, request);
  const band = resolveBand(kb, riskScore);
  const { annualPremium, monthlyPremium, coverageDetails } = calculatePremium(kb, band);

  const riskSummary = composeSummary({
    band,
    request,
    riskScore,
    annualPremium,
    monthlyPremium,
    appliedFactors,
  });

  // Principle III: every field, every time. There is no partial success shape.
  const quote: QuoteResult = {
    monthlyPremium,
    annualPremium,
    riskBand: band.id,
    riskBandLabel: band.label,
    riskScore,
    riskSummary,
    coverageDetails,
    appliedFactors,
    kbVersion: kb.version,
  };

  return { statusCode: 200, headers: { ...JSON_HEADERS }, body: JSON.stringify(quote) };
}

/**
 * The body stays `unknown` until Zod has seen it. A `null` body, non-JSON text,
 * or a JSON array must all become a 400 with a usable message, never a crash.
 *
 * Distinguishing "no body", "not JSON" and "JSON but not an object" matters:
 * they have different causes and a single generic message would leave the
 * caller guessing which one they hit.
 */
type DecodedBody = { ok: true; value: unknown } | { ok: false; message: string };

function decodeBody(event: QuoteApiEvent): DecodedBody {
  if (event.body === null || event.body === '') {
    return { ok: false, message: 'Request body is required.' };
  }

  const text =
    event.isBase64Encoded === true
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, message: 'Request body must be valid JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  return { ok: true, value: parsed };
}

function errorResponse(statusCode: number, body: ErrorResponse | ValidationErrorResponse): QuoteApiResponse {
  return { statusCode, headers: { ...JSON_HEADERS }, body: JSON.stringify(body) };
}

/**
 * Loads the KB once at module initialisation, before any request is served.
 *
 * A KB failure MUST prevent startup (FR-012, FR-013b): serving quotes from
 * partial, defaulted or unsupported rules would mis-price silently, which is
 * strictly worse than not serving at all.
 */
function loadKbOrExit(filePath: string): RiskKnowledgeBase {
  try {
    return loadKnowledgeBase(filePath);
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    process.stderr.write(`\nFATAL: the risk Knowledge Base could not be loaded.\n${message}\n\n`);
    process.exit(1);
  }
}

export const knowledgeBase: RiskKnowledgeBase = loadKbOrExit(KB_FILE_PATH);

/** The exported entry point required by Principle III. */
export const handler: QuoteHandler = createQuoteHandler(knowledgeBase);
