/**
 * The closed set of substitution tokens a KB `summaryTemplate` may use.
 *
 * This is an ENGINE CAPABILITY, not a rule: the KB decides what prose to write
 * and which tokens to use, the engine decides which tokens can be resolved.
 * Any other `{{token}}` is a load-time validation failure rather than a partial
 * substitution, because silently emitting an unresolved token — or an empty
 * string — would show a customer a broken or misleading explanation (FR-014b).
 *
 * Adding an entry here is a capability change and must ship with a test
 * (Development-Workflow gate 3).
 */
export const SUMMARY_PLACEHOLDERS = Object.freeze([
  'customerName',
  'riskScore',
  'riskBandLabel',
  'annualPremium',
  'monthlyPremium',
  'appliedFactorCount',
  'propertyType',
] as const);

export type SummaryPlaceholder = (typeof SUMMARY_PLACEHOLDERS)[number];

const PLACEHOLDER_SET: ReadonlySet<string> = new Set<string>(SUMMARY_PLACEHOLDERS);

export function isSummaryPlaceholder(token: string): token is SummaryPlaceholder {
  return PLACEHOLDER_SET.has(token);
}

/**
 * Matches `{{token}}` with optional surrounding whitespace. Declared as a
 * factory rather than a shared constant so that callers never trip over
 * `lastIndex` state leaking between invocations of a global regex — a source
 * of non-determinism that Principle V forbids.
 */
export function placeholderPattern(): RegExp {
  return /\{\{\s*([^}\s]*)\s*\}\}/g;
}

/** Every distinct token used in `template`, in first-appearance order. */
export function extractPlaceholders(template: string): string[] {
  const found: string[] = [];
  for (const match of template.matchAll(placeholderPattern())) {
    const token = match[1] ?? '';
    if (!found.includes(token)) {
      found.push(token);
    }
  }
  return found;
}
