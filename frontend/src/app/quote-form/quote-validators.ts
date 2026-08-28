/**
 * Client-side mirrors of the server's request rules.
 *
 * These exist for responsiveness only. The backend revalidates everything and
 * remains the sole authority (FR-002a); nothing here may be relied upon for
 * correctness. The bounds and the postcode pattern are transcribed from
 * `data-model.md` §1 — the SAME canonical pattern the server uses — so the two
 * cannot disagree about what a valid postcode is and leave a customer unable to
 * submit a postcode the server would have accepted.
 */

import { Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';

/** The canonical UK postcode pattern (data-model.md §1), applied after normalisation. */
export const POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

export const REQUEST_BOUNDS = {
  customerNameMaxLength: 100,
  minAge: 18,
  maxAge: 120,
  maxPropertyValue: 100_000_000,
  maxPreviousClaims: 50,
} as const;

/**
 * Validates the postcode against the canonical pattern after trimming and
 * uppercasing, exactly as the server normalises before matching. Without the
 * same normalisation, `sw1a 1aa` would be rejected here and accepted there.
 */
export function postcodeValidator(control: AbstractControl): ValidationErrors | null {
  const raw: unknown = control.value;

  if (typeof raw !== 'string' || raw.trim() === '') {
    return { required: true };
  }

  return POSTCODE_PATTERN.test(raw.trim().toUpperCase()) ? null : { postcode: true };
}

/** Rejects a value that is not a whole number, matching the server's integer fields. */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const raw: unknown = control.value;

  if (raw === null || raw === '' || raw === undefined) {
    return null;
  }

  return Number.isInteger(Number(raw)) ? null : { integer: true };
}

export const NAME_VALIDATORS = [
  Validators.required,
  Validators.maxLength(REQUEST_BOUNDS.customerNameMaxLength),
];

export const AGE_VALIDATORS = [
  Validators.required,
  integerValidator,
  Validators.min(REQUEST_BOUNDS.minAge),
  Validators.max(REQUEST_BOUNDS.maxAge),
];

export const PROPERTY_VALUE_VALIDATORS = [
  Validators.required,
  Validators.min(1),
  Validators.max(REQUEST_BOUNDS.maxPropertyValue),
];

export const PREVIOUS_CLAIMS_VALIDATORS = [
  Validators.required,
  integerValidator,
  Validators.min(0),
  Validators.max(REQUEST_BOUNDS.maxPreviousClaims),
];

/**
 * Customer-facing wording for each client-side failure.
 *
 * Deliberately mirrors the server's phrasing so a rule enforced in both places
 * reads identically whichever side catches it.
 */
export const CLIENT_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  required: 'This field is required.',
  maxlength: `Must be ${REQUEST_BOUNDS.customerNameMaxLength} characters or fewer.`,
  integer: 'Must be a whole number.',
  postcode: 'Please enter a valid UK postcode, for example SW1A 1AA.',
});

export const RANGE_MESSAGES: Readonly<Record<string, (bound: number) => string>> = Object.freeze({
  min: (bound) => `Must be ${bound} or more.`,
  max: (bound) => `Must be ${bound} or less.`,
});
