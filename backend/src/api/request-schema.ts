import { z } from 'zod';

/**
 * The quote request schema — the only trust boundary the engine has.
 *
 * **Normalisation is part of parsing.** Trimming and uppercasing happen inside
 * the schema, so the engine only ever sees a normalised request and no
 * downstream module can forget to normalise. That is what makes a postcode
 * prefix factor behave the same whether the customer typed `ex4 4qj` or
 * `EX4 4QJ`.
 *
 * No field is optional and none has a default: a missing field produces a
 * field-level error, never a defaulted value, because a defaulted value would
 * silently mis-price.
 */

/**
 * The canonical UK postcode pattern (data-model.md §1). Applied AFTER trim and
 * uppercase. It accepts the standard outward/inward forms with an optional
 * separating space and deliberately does not check the value against the live
 * postcode file — the spec treats a postcode as captured, not verified.
 */
export const POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

/** FR-002a fixes these bounds so that "outside accepted ranges" is measurable. */
export const REQUEST_BOUNDS = Object.freeze({
  customerNameMaxLength: 100,
  minAge: 18,
  maxAge: 120,
  maxPropertyValue: 100_000_000,
  maxPreviousClaims: 50,
});

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow'] as const;

export const quoteRequestSchema = z.strictObject({
  customerName: z
    .string({ error: 'Please enter your name.' })
    .trim()
    .min(1, 'Please enter your name.')
    .max(
      REQUEST_BOUNDS.customerNameMaxLength,
      `Name must be ${REQUEST_BOUNDS.customerNameMaxLength} characters or fewer.`,
    ),

  age: z
    .int({ error: 'Age must be a whole number.' })
    .min(REQUEST_BOUNDS.minAge, `Age must be at least ${REQUEST_BOUNDS.minAge}.`)
    .max(REQUEST_BOUNDS.maxAge, `Age must be ${REQUEST_BOUNDS.maxAge} or less.`),

  propertyType: z.enum(PROPERTY_TYPES, {
    error: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}.`,
  }),

  propertyValue: z
    .number({ error: 'Property value must be a number.' })
    .finite('Property value must be a number.')
    .positive('Property value must be greater than 0.')
    .max(
      REQUEST_BOUNDS.maxPropertyValue,
      `Property value must be £${REQUEST_BOUNDS.maxPropertyValue.toLocaleString('en-GB')} or less.`,
    ),

  postcode: z
    .string({ error: 'Please enter your postcode.' })
    .trim()
    .toUpperCase()
    .regex(POSTCODE_PATTERN, 'Please enter a valid UK postcode, for example SW1A 1AA.'),

  previousClaims: z
    .int({ error: 'Previous claims must be a whole number.' })
    .min(0, 'Previous claims cannot be negative.')
    .max(
      REQUEST_BOUNDS.maxPreviousClaims,
      `Previous claims must be ${REQUEST_BOUNDS.maxPreviousClaims} or fewer.`,
    ),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type PropertyType = QuoteRequest['propertyType'];
