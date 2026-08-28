import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { riskKnowledgeBaseSchema, type RiskKnowledgeBase } from '../../src/kb/kb-schema.ts';

/**
 * Test fixtures for the Knowledge Base.
 *
 * `validKbObject()` returns a deliberately MINIMAL but complete KB. Tests
 * derive invalid variants from it by mutation, so each test states exactly one
 * defect and nothing else — a failing test then names its own cause.
 *
 * Fixtures are written to real temp files because `loadKnowledgeBase` reads
 * from disk; stubbing `fs` would test the stub rather than the loader.
 */

export interface MutableKb {
  version: string;
  basePremium: number;
  coverageLoadFactor: number;
  riskBands: Array<Record<string, unknown>>;
  factors: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export function validKbObject(): MutableKb {
  return {
    version: '1.0.0',
    basePremium: 200,
    coverageLoadFactor: 1.5,
    riskBands: [
      {
        id: 'LOW',
        label: 'Low',
        min: 0,
        max: 10,
        riskMultiplier: 1,
        summaryTemplate: '{{customerName}} scored {{riskScore}} — {{riskBandLabel}}.',
      },
      {
        id: 'MID',
        label: 'Middling',
        min: 11,
        max: 30,
        riskMultiplier: 2,
        summaryTemplate: '{{customerName}} scored {{riskScore}} — {{riskBandLabel}}.',
      },
      {
        id: 'TOP',
        label: 'Topmost',
        min: 31,
        max: 100,
        riskMultiplier: 4,
        summaryTemplate: '{{customerName}} scored {{riskScore}} — {{riskBandLabel}}.',
      },
    ],
    factors: [
      {
        id: 'flat',
        description: 'Flat',
        condition: { field: 'propertyType', operator: 'eq', value: 'Flat' },
        points: 12,
      },
      {
        id: 'older_or_younger',
        description: 'Outside the 25-75 age range',
        condition: { field: 'age', operator: 'outside range', min: 25, max: 75 },
        points: 25,
      },
    ],
  };
}

/** Writes `contents` (an object, or raw text for malformed-JSON cases) to a fresh temp file. */
export function writeKbFile(contents: unknown, fileName = 'risk-kb.json'): string {
  const dir = mkdtempSync(join(tmpdir(), 'policyquote-kb-'));
  const filePath = join(dir, fileName);
  const text = typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2);
  writeFileSync(filePath, text, 'utf8');
  return filePath;
}

/** Applies `mutate` to a fresh valid KB and writes the result, returning its path. */
export function writeMutatedKb(mutate: (kb: MutableKb) => void): string {
  const kb = validKbObject();
  mutate(kb);
  return writeKbFile(kb);
}

/**
 * A parsed, schema-valid KB for engine tests.
 *
 * Engine tests take the KB through the real schema rather than casting an
 * object literal, so a fixture that the loader would reject can never be used
 * to "prove" engine behaviour.
 */
export function parsedKb(mutate: (kb: MutableKb) => void = () => {}): RiskKnowledgeBase {
  const kb = validKbObject();
  mutate(kb);
  return riskKnowledgeBaseSchema.parse(kb);
}
