import { readFileSync } from 'node:fs';
import semver from 'semver';

import { crossValidateKnowledgeBase } from './kb-cross-validation.ts';
import { KbMalformedError, KbNotFoundError, KbUnsupportedVersionError } from './kb-errors.ts';
import { riskKnowledgeBaseSchema, type RiskKnowledgeBase } from './kb-schema.ts';
import { SUPPORTED_KB_VERSION_RANGE } from './supported-versions.ts';

/**
 * Read, validate and version-gate the Knowledge Base from a LOCAL FILE.
 *
 * The KB is never fetched from a remote service (Principle V, FR-007): a
 * network dependency would make the quote non-deterministic and would let the
 * service start with rules that later change underneath it.
 *
 * Load sequence, in this order deliberately:
 *
 *   1. read file          → KbNotFoundError
 *   2. parse JSON         → KbMalformedError
 *   3. schema validation  → KbMalformedError
 *   4. version gate       → KbUnsupportedVersionError
 *   5. cross-validation   → KbMalformedError
 *
 * The version check sits AFTER structural validation because a file must be
 * well-formed before its version claim means anything — and the two failures
 * are distinct spec edge cases needing distinct messages.
 */
export function loadKnowledgeBase(filePath: string): RiskKnowledgeBase {
  const raw = readFile(filePath);
  const json = parseJson(filePath, raw);
  const kb = validateStructure(filePath, json);

  assertSupportedVersion(filePath, kb.version);

  const problems = crossValidateKnowledgeBase(kb);
  if (problems.length > 0) {
    throw new KbMalformedError(filePath, problems);
  }

  return kb;
}

function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (cause: unknown) {
    throw new KbNotFoundError(filePath, cause);
  }
}

function parseJson(filePath: string, raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new KbMalformedError(filePath, [`file is not valid JSON: ${detail}`]);
  }
}

function validateStructure(filePath: string, json: unknown): RiskKnowledgeBase {
  const result = riskKnowledgeBaseSchema.safeParse(json);
  if (result.success) {
    return result.data;
  }

  const problems = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    const owner = describeOwner(json, issue.path);
    return `${path}${owner}: ${issue.message}`;
  });

  throw new KbMalformedError(filePath, problems);
}

/**
 * Names the factor or band a structural problem belongs to.
 *
 * A raw Zod path such as `factors.0.condition` — especially the bare
 * "Invalid input" a closed union produces for an unknown operator — tells a
 * pricing specialist nothing about WHICH rule they broke. The id does (FR-012).
 *
 * Read from the raw JSON rather than the parsed result, because by definition
 * parsing failed. Everything is treated as `unknown` and narrowed, so a
 * malformed file cannot make the error reporter itself throw.
 */
function describeOwner(json: unknown, path: ReadonlyArray<PropertyKey>): string {
  const [collection, index] = path;

  if (
    (collection !== 'factors' && collection !== 'riskBands') ||
    typeof index !== 'number' ||
    typeof json !== 'object' ||
    json === null
  ) {
    return '';
  }

  const entries = (json as Record<string, unknown>)[collection];
  if (!Array.isArray(entries)) {
    return '';
  }

  const entry: unknown = entries[index];
  if (typeof entry !== 'object' || entry === null) {
    return '';
  }

  const id = (entry as Record<string, unknown>)['id'];
  return typeof id === 'string' && id.length > 0 ? ` ("${id}")` : '';
}

function assertSupportedVersion(filePath: string, versionFound: string): void {
  if (!semver.satisfies(versionFound, SUPPORTED_KB_VERSION_RANGE)) {
    throw new KbUnsupportedVersionError(filePath, versionFound, SUPPORTED_KB_VERSION_RANGE);
  }
}
