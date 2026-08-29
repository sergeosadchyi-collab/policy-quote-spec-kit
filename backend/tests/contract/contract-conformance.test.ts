import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Ajv and ajv-formats ship ESM-syntax declarations inside CommonJS packages,
 * which NodeNext resolves such that a plain default import is not callable.
 * `Ajv2020` is exported by name at runtime and in the typings, so it is taken
 * directly; ajv-formats only has a default, so its namespace is narrowed to the
 * plugin's published interface rather than to `any`.
 */
import { Ajv2020 } from 'ajv/dist/2020.js';
import * as ajvFormats from 'ajv-formats';
import type { FormatsPlugin } from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const addFormats = (ajvFormats as unknown as { default: FormatsPlugin }).default;

import { createQuoteHandler, KB_FILE_PATH } from '../../src/handler.ts';
import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import { anEvent, noContext } from '../helpers/event-fixture.ts';
import { aRequestBody } from '../helpers/request-fixture.ts';

/**
 * The published contracts and the runtime authority must not drift.
 *
 * `contracts/risk-kb.schema.json` and `contracts/policy-quote.openapi.yaml` are
 * the human- and tool-readable statements of the contract; the Zod schemas are
 * what actually run. Nothing but a test keeps the two honest — a schema change
 * on either side that the other did not receive is silent otherwise.
 *
 * These tests validate the SHIPPED artifacts, not fixtures, so the file a
 * reviewer opens is the file that was checked.
 */

const contractPath = (name: string): string =>
  fileURLToPath(new URL(`../../../specs/001-policy-quote-app/contracts/${name}`, import.meta.url));

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

describe('published contract conformance', () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  describe('risk-kb.json against the published JSON Schema', () => {
    // Compiled once: Ajv caches by `$id` and refuses to compile the same
    // document twice, so each test must share the compiled validator.
    const validateKb = ajv.compile(readJson(contractPath('risk-kb.schema.json')));
    const kb = readJson(KB_FILE_PATH);

    it('validates the shipped Knowledge Base', () => {
      const valid = validateKb(kb);

      // Surface the actual problems: "false" alone would send the reader
      // hunting through a 60-line file with no clue where to look.
      expect(validateKb.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
    });

    it('rejects a Knowledge Base the Zod schema would also reject', () => {
      // Confirms the published schema is genuinely constraining rather than
      // vacuously permissive — a schema that accepts everything would pass the
      // test above while protecting nothing.
      expect(validateKb({ ...kb, basePremium: 'free' })).toBe(false);
      expect(validateKb({ ...kb, riskBands: [] })).toBe(false);
      expect(validateKb({ ...kb, unexpectedKey: true })).toBe(false);
    });
  });

  describe('handler responses against the published OpenAPI document', () => {
    const openapi = parseYaml(readFileSync(contractPath('policy-quote.openapi.yaml'), 'utf8')) as {
      components: { schemas: Record<string, unknown> };
    };

    /**
     * OpenAPI `$ref`s are resolved by registering every component schema under
     * the exact `#/components/schemas/...` key the document uses, so the
     * published refs are exercised as written rather than rewritten for the test.
     */
    const compileFor = (name: string) => {
      const validator = new Ajv2020({ strict: false, allErrors: true });
      addFormats(validator);

      for (const [schemaName, schema] of Object.entries(openapi.components.schemas)) {
        validator.addSchema(schema as object, `#/components/schemas/${schemaName}`);
      }

      return validator.getSchema(`#/components/schemas/${name}`);
    };

    const handler = createQuoteHandler(loadKnowledgeBase(KB_FILE_PATH));

    const responseFor = async (body: string) => {
      const response = await handler(anEvent({ body }), noContext);
      return { response, payload: JSON.parse(response.body) as unknown };
    };

    it.each([
      ['a low-risk profile', aRequestBody()],
      ['a mid-risk profile', aRequestBody({ propertyType: 'Flat', age: 22 })],
      [
        'a high-risk profile',
        aRequestBody({ propertyType: 'Flat', age: 80, propertyValue: 820000, previousClaims: 3 }),
      ],
    ])('a 200 for %s satisfies QuoteResult', async (_label, body) => {
      const validate = compileFor('QuoteResult');
      if (validate === undefined) throw new Error('QuoteResult schema not found in OpenAPI document');

      const { response, payload } = await responseFor(body);

      expect(response.statusCode).toBe(200);
      const valid = validate(payload);
      expect(validate.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
    });

    it('a 400 satisfies ValidationErrorResponse', async () => {
      const validate = compileFor('ValidationErrorResponse');
      if (validate === undefined) {
        throw new Error('ValidationErrorResponse schema not found in OpenAPI document');
      }

      const { response, payload } = await responseFor(aRequestBody({ age: 5 }));

      expect(response.statusCode).toBe(400);
      const valid = validate(payload);
      expect(validate.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
    });

    it('a 405 satisfies ErrorResponse', async () => {
      const validate = compileFor('ErrorResponse');
      if (validate === undefined) throw new Error('ErrorResponse schema not found');

      const response = await handler(anEvent({ httpMethod: 'GET', body: null }), noContext);

      expect(response.statusCode).toBe(405);
      expect(validate(JSON.parse(response.body))).toBe(true);
    });
  });
});
