import { extractPlaceholders, isSummaryPlaceholder } from '../engine/summary-placeholders.ts';
import { LEAF_OPERATORS, isLeafOperator } from '../engine/operators.ts';
import { groupKeyOf } from '../engine/combinators.ts';
import type { Condition, RiskKnowledgeBase } from './kb-schema.ts';

/**
 * Cross-field Knowledge Base validation (FR-012).
 *
 * These are the rules a per-field schema structurally cannot express: they
 * relate one node to another, or to an engine capability. Each problem names
 * the offending node so the person who made the edit can find it without
 * reading the whole file.
 *
 * Returning problems rather than throwing keeps this unit pure and directly
 * unit-testable (Principle IV); `kb-loader` turns a non-empty result into a
 * `KbMalformedError`.
 *
 * Further rules that depend on the recursive condition schema — unknown
 * operators, empty groups, unknown fields, `occurrenceField` shape — are added
 * with User Story 3.
 */
export function crossValidateKnowledgeBase(kb: RiskKnowledgeBase): string[] {
  return [
    ...validateBandOrderingAndContiguity(kb),
    ...validateUniqueFactorIds(kb),
    ...validateSummaryPlaceholders(kb),
    ...validateFactorConditions(kb),
    ...validateOccurrenceFields(kb),
  ];
}

/**
 * The reference request shape.
 *
 * Cross-validation is the only place that may know both the KB and the request,
 * which is exactly why these checks live here and not in `kb-schema.ts`. The
 * numeric subset is listed separately because only a numeric field can be
 * counted for per-occurrence scoring.
 */
const REQUEST_FIELDS: readonly string[] = [
  'customerName',
  'age',
  'propertyType',
  'propertyValue',
  'postcode',
  'previousClaims',
];

const NUMERIC_REQUEST_FIELDS: readonly string[] = ['age', 'propertyValue', 'previousClaims'];

/**
 * Walk every condition, however deeply nested, and check the things the schema
 * cannot: that a leaf names a real request field and a known operator.
 *
 * Every problem names the offending FACTOR, not just a path. A structural
 * complaint about `factors[3].condition.all[1].any[0]` tells a pricing
 * specialist almost nothing; the factor id tells them which rule they broke
 * (FR-012).
 */
function validateFactorConditions(kb: RiskKnowledgeBase): string[] {
  const problems: string[] = [];

  kb.factors.forEach((factor, index) => {
    walkCondition(factor.condition, (problem) => {
      problems.push(`factors[${index}] ("${factor.id}"): ${problem}`);
    });
  });

  return problems;
}

function walkCondition(condition: Condition, report: (problem: string) => void): void {
  const groupKey = groupKeyOf(condition);

  if (groupKey !== undefined) {
    const members = (condition as Record<string, Condition[]>)[groupKey] ?? [];

    if (members.length === 0) {
      report(`the "${groupKey}" group is empty; a group must contain at least one condition.`);
      return;
    }

    for (const member of members) {
      walkCondition(member, report);
    }
    return;
  }

  const leaf = condition as { field?: unknown; operator?: unknown };

  if (typeof leaf.operator !== 'string' || !isLeafOperator(leaf.operator)) {
    report(
      `unknown condition operator "${String(leaf.operator)}". ` +
        `Known operators: ${Object.keys(LEAF_OPERATORS).join(', ')}.`,
    );
  }

  if (typeof leaf.field !== 'string' || !REQUEST_FIELDS.includes(leaf.field)) {
    report(
      `condition references "${String(leaf.field)}", which is not a field of the quote request. ` +
        `Known fields: ${REQUEST_FIELDS.join(', ')}.`,
    );
  }
}

/**
 * `occurrenceField` must name a NUMERIC request field.
 *
 * The schema already guarantees the field is present when `perOccurrence` is
 * set; this checks it points at something countable. Multiplying points by a
 * customer's name is not a runtime error worth discovering mid-quote.
 */
function validateOccurrenceFields(kb: RiskKnowledgeBase): string[] {
  const problems: string[] = [];

  kb.factors.forEach((factor, index) => {
    if (factor.occurrenceField === undefined) {
      return;
    }

    if (!NUMERIC_REQUEST_FIELDS.includes(factor.occurrenceField)) {
      problems.push(
        `factors[${index}] ("${factor.id}"): occurrenceField "${factor.occurrenceField}" must name ` +
          `a numeric quote-request field. Numeric fields: ${NUMERIC_REQUEST_FIELDS.join(', ')}.`,
      );
    }
  });

  return problems;
}

/**
 * Bands must be declared in ascending score order AND be contiguous.
 *
 * Ascending order is not cosmetic: `band-resolver` clamps an out-of-range score
 * to the LAST band positionally, precisely so that no band identifier appears
 * in code (Principle I). If the array were unsorted, "last" would not mean
 * "highest" and an extreme score would resolve to the wrong band.
 *
 * Contiguity closes the two failure modes that would otherwise be silent: a gap
 * leaves some scores unresolvable, and an overlap makes resolution ambiguous.
 */
function validateBandOrderingAndContiguity(kb: RiskKnowledgeBase): string[] {
  const problems: string[] = [];

  for (let i = 0; i < kb.riskBands.length - 1; i += 1) {
    const current = kb.riskBands[i];
    const next = kb.riskBands[i + 1];
    if (current === undefined || next === undefined) continue;

    if (next.min <= current.min) {
      problems.push(
        `riskBands[${i + 1}] ("${next.id}") must be declared after a band with a lower min: ` +
          `min ${next.min} does not follow riskBands[${i}] ("${current.id}") with min ${current.min}. ` +
          `Bands must be listed in ascending score order.`,
      );
      continue;
    }

    if (next.min !== current.max + 1) {
      const kind = next.min > current.max + 1 ? 'a gap' : 'an overlap';
      problems.push(
        `riskBands[${i}] ("${current.id}") ends at ${current.max} but riskBands[${i + 1}] ` +
          `("${next.id}") starts at ${next.min} — ${kind} of scores. Bands must be contiguous: ` +
          `each band's min must equal the previous band's max + 1.`,
      );
    }
  }

  const seen = new Map<string, number>();
  kb.riskBands.forEach((band, index) => {
    const first = seen.get(band.id);
    if (first !== undefined) {
      problems.push(
        `riskBands[${index}] repeats the band id "${band.id}" already declared at riskBands[${first}].`,
      );
    } else {
      seen.set(band.id, index);
    }
  });

  return problems;
}

/** Duplicate factor ids would double-count and make an applied factor ambiguous to the customer. */
function validateUniqueFactorIds(kb: RiskKnowledgeBase): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();

  kb.factors.forEach((factor, index) => {
    const first = seen.get(factor.id);
    if (first !== undefined) {
      problems.push(
        `factors[${index}] repeats the factor id "${factor.id}" already declared at factors[${first}]. ` +
          `Factor ids must be unique.`,
      );
    } else {
      seen.set(factor.id, index);
    }
  });

  return problems;
}

/**
 * Every `{{token}}` must be one the engine can resolve (FR-014b). A typo must
 * fail at startup, not surface to a customer as a literal `{{riskBandLable}}`
 * or as an empty gap in the middle of a sentence.
 */
function validateSummaryPlaceholders(kb: RiskKnowledgeBase): string[] {
  const problems: string[] = [];

  kb.riskBands.forEach((band, index) => {
    for (const token of extractPlaceholders(band.summaryTemplate)) {
      if (!isSummaryPlaceholder(token)) {
        problems.push(
          `riskBands[${index}].summaryTemplate ("${band.id}") uses unknown placeholder ` +
            `"{{${token}}}". The engine can only substitute its published placeholder set.`,
        );
      }
    }
  });

  return problems;
}
