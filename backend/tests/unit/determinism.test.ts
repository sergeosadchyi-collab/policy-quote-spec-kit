import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { createQuoteHandler, KB_FILE_PATH } from '../../src/handler.ts';
import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import { anEvent, noContext } from '../helpers/event-fixture.ts';
import { aRequestBody } from '../helpers/request-fixture.ts';

/**
 * Determinism is a constitutional property, not an aspiration (Principle V,
 * FR-020, SC-008): identical details evaluated against an identical KB must
 * produce an identical result, byte for byte.
 *
 * Two complementary checks. The behavioural one proves the property for a
 * sample of inputs; the static one proves the CAUSES of non-determinism are
 * absent from the engine, which is what stops a future edit from quietly
 * reintroducing them.
 */
describe('determinism', () => {
  const kb = loadKnowledgeBase(KB_FILE_PATH);
  const handler = createQuoteHandler(kb);

  const baseline = aRequestBody();
  const flatYoung = aRequestBody({ propertyType: 'Flat', age: 22 });
  const highRisk = aRequestBody({
    propertyType: 'Flat',
    age: 80,
    propertyValue: 820000,
    previousClaims: 3,
  });

  const profiles = [baseline, flatYoung, highRisk];

  it.each(profiles)('returns a byte-identical body across 20 invocations', async (body) => {
    const first = await handler(anEvent({ body }), noContext);
    expect(first.statusCode).toBe(200);

    for (let attempt = 0; attempt < 19; attempt += 1) {
      const repeat = await handler(anEvent({ body }), noContext);

      expect(repeat.statusCode).toBe(first.statusCode);
      expect(repeat.body).toBe(first.body);
    }
  });

  it('is unaffected by the context it is handed', async () => {
    const body = highRisk;
    const bare = await handler(anEvent({ body }), {});
    const populated = await handler(anEvent({ body }), {
      awsRequestId: 'req-1',
      functionName: 'policy-quote',
    });

    expect(populated.body).toBe(bare.body);
  });

  it('is unaffected by request header ordering or extra headers', async () => {
    const body = flatYoung;
    const plain = await handler(anEvent({ body }), noContext);
    const decorated = await handler(
      anEvent({ body, headers: { 'x-trace-id': 'abc', 'content-type': 'application/json' } }),
      noContext,
    );

    expect(decorated.body).toBe(plain.body);
  });

  describe('the engine contains no source of non-determinism', () => {
    const engineDir = fileURLToPath(new URL('../../src/engine/', import.meta.url));
    const engineFiles = readdirSync(engineDir).filter((name) => name.endsWith('.ts'));

    it('has engine modules to inspect', () => {
      expect(engineFiles.length).toBeGreaterThan(0);
    });

    it.each([
      ['a clock', /\bDate\b/],
      ['randomness', /Math\s*\.\s*random/],
      ['an environment lookup', /process\s*\.\s*env/],
      ['a network call', /\b(?:fetch|XMLHttpRequest|https?\s*\.\s*request)\b/],
      ['a timer', /\b(?:setTimeout|setInterval|hrtime|performance\s*\.\s*now)\b/],
    ])('uses no %s', (_label, pattern) => {
      const offenders = engineFiles.filter((name) =>
        pattern.test(readFileSync(join(engineDir, name), 'utf8')),
      );

      expect(offenders).toEqual([]);
    });
  });
});
