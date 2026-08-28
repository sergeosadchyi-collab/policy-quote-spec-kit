import type { z } from 'zod';

import type { ValidationErrorResponse, ValidationIssue } from './response-types.ts';

/**
 * Turns a Zod failure into the field-attributed error the customer sees
 * (FR-017).
 *
 * Two properties matter here. First, every issue is attributed to a NAMED
 * field, so a client can position the message beside the input that caused it
 * rather than dumping a list at the top of the form. Second, the messages are
 * the ones authored in the request schema — they are written for customers, not
 * copied from Zod's internal vocabulary, so nothing resembling
 * `invalid_type: expected number, received string` can reach a screen.
 *
 * This module never sees a premium and cannot construct one; a validation
 * failure has no pricing information to leak by accident (SC-007).
 */

const FALLBACK_MESSAGE = 'Please check this value.';

/** Used when the body is not even an object — there is no field to attribute to. */
export const BODY_FIELD = 'body';

export function toValidationErrorResponse(error: z.ZodError): ValidationErrorResponse {
  return {
    error: 'VALIDATION_ERROR',
    message: 'Please correct the highlighted fields.',
    issues: dedupeByField(error.issues.map(toIssue)),
  };
}

/** For bodies that are absent, unparseable, or not a JSON object at all. */
export function bodyValidationError(message: string): ValidationErrorResponse {
  return {
    error: 'VALIDATION_ERROR',
    message,
    issues: [{ field: BODY_FIELD, message }],
  };
}

function toIssue(issue: z.core.$ZodIssue): ValidationIssue {
  // A top-level failure (e.g. the body is an array) has an empty path; there is
  // no field to blame, so it is attributed to the body itself rather than to an
  // arbitrarily chosen input.
  const field = issue.path.length > 0 ? issue.path.map(String).join('.') : BODY_FIELD;

  return { field, message: issue.message.length > 0 ? issue.message : FALLBACK_MESSAGE };
}

/**
 * One message per field.
 *
 * Zod can raise several issues for a single input — a value that is both the
 * wrong type and out of range, say. Showing a customer two complaints about one
 * box reads as a malfunction. The first is kept because schema rules are
 * declared from most fundamental to most specific.
 */
function dedupeByField(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    if (seen.has(issue.field)) {
      return false;
    }
    seen.add(issue.field);
    return true;
  });
}
