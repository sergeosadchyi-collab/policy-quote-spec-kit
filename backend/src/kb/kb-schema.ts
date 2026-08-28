import { z } from 'zod';

/**
 * The runtime authority for the Knowledge Base file format.
 *
 * `contracts/risk-kb.schema.json` is the published, human-readable statement of
 * this contract; this module is what actually validates the file at load time
 * (Principle IV). A conformance test asserts the two cannot drift.
 *
 * Every type is surfaced via `z.infer<>` — no hand-written interface duplicates
 * a schema, so a schema change cannot leave a stale type behind.
 *
 * This module knows nothing about HTTP or scoring. In particular it does NOT
 * check that a leaf `field` names a real quote-request key: that is a
 * cross-validation concern (`kb-cross-validation.ts`), because it requires
 * knowledge of the request shape.
 */

/** Strict everywhere: an unrecognised key is an authoring mistake, not something to strip silently. */
const strict = z.strictObject;

// --- Leaf conditions -------------------------------------------------------
//
// Operand shape is enforced PER OPERATOR by a discriminated union, so
// `{ operator: 'between', value: 3 }` fails at load time rather than
// evaluating against `undefined` at request time.

const fieldName = z.string().min(1, 'condition field must be a non-empty string');

const comparisonLeafSchema = strict({
  field: fieldName,
  operator: z.enum(['eq', 'gt', 'gte']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

/** `startsWith` is a string-only comparison, so its operand is narrowed accordingly. */
const prefixLeafSchema = strict({
  field: fieldName,
  operator: z.literal('startsWith'),
  value: z.string().min(1),
});

const rangeLeafSchema = strict({
  field: fieldName,
  operator: z.enum(['between', 'outside range']),
  min: z.number(),
  max: z.number(),
});

export const leafConditionSchema = z.union([
  comparisonLeafSchema,
  prefixLeafSchema,
  rangeLeafSchema,
]);

export type LeafCondition = z.infer<typeof leafConditionSchema>;

// --- Group conditions ------------------------------------------------------
//
// A condition is a leaf OR a group, and a group's members are themselves
// conditions — so nesting is unbounded and a leaf and a group are
// interchangeable at every position (FR-010a). That is what lets the KB express
// "Flat AND over £500k" without the engine gaining a rule about flats.
//
// The union stays CLOSED: no `z.any()`, no passthrough. An unknown operator or
// an unrecognised node shape is rejected at load time and can never reach the
// evaluator (Principle IV).

/**
 * The recursive type must be written by hand because `z.lazy()` cannot infer
 * through its own cycle. This is the one place a type is not derived via
 * `z.infer<>`, and the schema below is annotated with it so the two are checked
 * against each other rather than merely coexisting.
 */
export type Condition =
  | LeafCondition
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition[] };

/** Empty groups are rejected: `all: []` is vacuously true and would price every customer. */
const nonEmptyMembers = (member: z.ZodType<Condition>) =>
  z.array(member).min(1, 'an all/any/not group must contain at least one condition');

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    leafConditionSchema,
    strict({ all: nonEmptyMembers(conditionSchema) }),
    strict({ any: nonEmptyMembers(conditionSchema) }),
    strict({ not: nonEmptyMembers(conditionSchema) }),
  ]),
);

// --- Risk band -------------------------------------------------------------

export const riskBandSchema = strict({
  id: z.string().min(1),
  label: z.string().min(1),
  min: z.int().min(0),
  max: z.int(),
  riskMultiplier: z.number().finite().positive(),
  summaryTemplate: z.string().min(1),
}).refine((band) => band.max >= band.min, {
  message: 'band max must be greater than or equal to band min',
});

export type RiskBand = z.infer<typeof riskBandSchema>;

// --- Risk factor -----------------------------------------------------------

export const riskFactorSchema = strict({
  id: z.string().min(1),
  description: z.string().min(1),
  condition: conditionSchema,
  // `points` may be negative: a discount is a legitimate underwriting rule.
  points: z.number().finite(),
  perOccurrence: z.boolean().optional(),
  occurrenceField: z.string().min(1).optional(),
}).refine((factor) => factor.perOccurrence !== true || factor.occurrenceField !== undefined, {
  // The count field is never inferred from the condition — a compound condition
  // spans several fields and would have no unambiguous one to count (FR-011).
  message: 'a factor with perOccurrence: true must also declare occurrenceField',
  path: ['occurrenceField'],
});

export type RiskFactor = z.infer<typeof riskFactorSchema>;

// --- Knowledge Base root ---------------------------------------------------

export const riskKnowledgeBaseSchema = strict({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'version must be a three-part semver string, e.g. "1.2.3"'),
  basePremium: z.number().finite().positive(),
  coverageLoadFactor: z.number().finite().positive(),
  riskBands: z.array(riskBandSchema).min(1, 'at least one risk band is required'),
  // An empty factor list is VALID: it yields a zero-score, lowest-band quote.
  factors: z.array(riskFactorSchema),
});

export type RiskKnowledgeBase = z.infer<typeof riskKnowledgeBaseSchema>;
