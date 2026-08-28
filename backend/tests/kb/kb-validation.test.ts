import { join } from 'node:path';

import { loadKnowledgeBase } from '../../src/kb/kb-loader.ts';
import {
  KbMalformedError,
  KbNotFoundError,
  KbUnsupportedVersionError,
} from '../../src/kb/kb-errors.ts';
import { SUPPORTED_KB_VERSION_RANGE } from '../../src/kb/supported-versions.ts';
import { writeKbFile, writeMutatedKb } from '../helpers/kb-fixture.ts';

/**
 * The Knowledge Base must fail LOUDLY (FR-012, FR-013b).
 *
 * Each case below is a way the service could otherwise start and quietly
 * mis-price. The assertions check the message names the offending node,
 * because "invalid KB" alone gives the pricing specialist who made the edit
 * nothing to act on.
 */
describe('Knowledge Base validation', () => {
  it('loads a well-formed Knowledge Base', () => {
    const path = writeMutatedKb(() => {});
    const kb = loadKnowledgeBase(path);

    expect(kb.version).toBe('1.0.0');
    expect(kb.riskBands).toHaveLength(3);
    expect(kb.factors).toHaveLength(2);
  });

  it('refuses a missing file with KbNotFoundError', () => {
    const missing = join(writeKbFile({}), '..', 'does-not-exist.json');

    expect(() => loadKnowledgeBase(missing)).toThrow(KbNotFoundError);
  });

  it('refuses malformed JSON', () => {
    const path = writeKbFile('{ "version": "1.0.0", oops }');

    expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
    expect(() => loadKnowledgeBase(path)).toThrow(/not valid JSON/i);
  });

  it('refuses a structurally invalid Knowledge Base, naming the offending path', () => {
    const path = writeMutatedKb((kb) => {
      kb.basePremium = -10;
    });

    expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
    expect(() => loadKnowledgeBase(path)).toThrow(/basePremium/);
  });

  it('refuses an unrecognised top-level key rather than silently ignoring it', () => {
    const path = writeMutatedKb((kb) => {
      kb.baseFee = 100;
    });

    expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
  });

  describe('band contiguity', () => {
    it('refuses a gap between bands', () => {
      const path = writeMutatedKb((kb) => {
        const second = kb.riskBands[1];
        if (second) second.min = 15;
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/gap/i);
      expect(() => loadKnowledgeBase(path)).toThrow(/MID/);
    });

    it('refuses overlapping bands', () => {
      const path = writeMutatedKb((kb) => {
        const first = kb.riskBands[0];
        if (first) first.max = 20;
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/overlap/i);
    });

    it('refuses bands declared out of ascending order', () => {
      const path = writeMutatedKb((kb) => {
        kb.riskBands.reverse();
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/ascending/i);
    });

    it('refuses a duplicate band id', () => {
      const path = writeMutatedKb((kb) => {
        const second = kb.riskBands[1];
        if (second) second.id = 'LOW';
      });

      expect(() => loadKnowledgeBase(path)).toThrow(/repeats the band id "LOW"/);
    });
  });

  it('refuses duplicate factor ids, which would double-count', () => {
    const path = writeMutatedKb((kb) => {
      const second = kb.factors[1];
      if (second) second.id = 'flat';
    });

    expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
    expect(() => loadKnowledgeBase(path)).toThrow(/repeats the factor id "flat"/);
  });

  it('refuses an unknown summary placeholder rather than substituting nothing', () => {
    const path = writeMutatedKb((kb) => {
      const band = kb.riskBands[0];
      if (band) band.summaryTemplate = 'Hello {{customerName}}, band {{riskBandLable}}.';
    });

    expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
    expect(() => loadKnowledgeBase(path)).toThrow(/riskBandLable/);
    expect(() => loadKnowledgeBase(path)).toThrow(/unknown placeholder/i);
  });

  describe('version gating', () => {
    it('refuses an unsupported version, reporting both found and expected', () => {
      const path = writeMutatedKb((kb) => {
        kb.version = '2.0.0';
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbUnsupportedVersionError);

      try {
        loadKnowledgeBase(path);
        throw new Error('expected loadKnowledgeBase to throw');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(KbUnsupportedVersionError);
        const versionError = error as KbUnsupportedVersionError;
        expect(versionError.versionFound).toBe('2.0.0');
        expect(versionError.rangeExpected).toBe(SUPPORTED_KB_VERSION_RANGE);
        expect(versionError.message).toContain('2.0.0');
        expect(versionError.message).toContain(SUPPORTED_KB_VERSION_RANGE);
      }
    });

    it('accepts an additive MINOR revision without redeployment', () => {
      const path = writeMutatedKb((kb) => {
        kb.version = '1.7.3';
      });

      expect(loadKnowledgeBase(path).version).toBe('1.7.3');
    });

    it('reports a malformed file as malformed even when its version is unsupported', () => {
      const path = writeMutatedKb((kb) => {
        kb.version = '9.9.9';
        kb.basePremium = 0;
      });

      // Structural validity is checked first: a file must be well-formed before
      // its version claim means anything.
      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
    });
  });

  it('accepts an empty factor list as a valid zero-score Knowledge Base', () => {
    const path = writeMutatedKb((kb) => {
      kb.factors = [];
    });

    const kb = loadKnowledgeBase(path);
    expect(kb.factors).toEqual([]);
  });

  /**
   * These failures only become REACHABLE once the schema accepts groups and a
   * wider operator set. Before User Story 3 an unknown operator was rejected by
   * the closed leaf union with a generic union error; now that conditions
   * recurse, the message must name the offending factor or an author faces a
   * structural complaint about a deeply nested object with no idea which rule
   * produced it (FR-012).
   */
  describe('rules reachable only with the recursive condition schema', () => {
    it('rejects an unknown operator and names the offending factor', () => {
      const path = writeMutatedKb((kb) => {
        kb.factors = [
          {
            id: 'mystery_rule',
            description: 'Uses an operator the engine does not have',
            condition: { field: 'age', operator: 'approximately', value: 40 },
            points: 5,
          },
        ];
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/mystery_rule/);
    });

    it('rejects an empty all/any/not group', () => {
      // An empty group has no defensible meaning: `all: []` is vacuously true
      // and would apply its points to every customer unconditionally.
      for (const combinator of ['all', 'any', 'not']) {
        const path = writeMutatedKb((kb) => {
          kb.factors = [
            {
              id: `empty_${combinator}`,
              description: 'Empty group',
              condition: { [combinator]: [] },
              points: 5,
            },
          ];
        });

        expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      }
    });

    it('rejects perOccurrence without occurrenceField', () => {
      // The count field is never inferred, so its absence is unrecoverable
      // rather than merely ambiguous.
      const path = writeMutatedKb((kb) => {
        kb.factors = [
          {
            id: 'per_claim',
            description: 'Each claim',
            condition: { field: 'previousClaims', operator: 'gte', value: 1 },
            points: 5,
            perOccurrence: true,
          },
        ];
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/occurrenceField/);
    });

    it('rejects an occurrenceField that is not a numeric request field', () => {
      const path = writeMutatedKb((kb) => {
        kb.factors = [
          {
            id: 'per_name',
            description: 'Counts a non-numeric field',
            condition: { field: 'previousClaims', operator: 'gte', value: 1 },
            points: 5,
            perOccurrence: true,
            occurrenceField: 'customerName',
          },
        ];
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/per_name/);
    });

    it('rejects a leaf field that is not part of the quote request', () => {
      const path = writeMutatedKb((kb) => {
        kb.factors = [
          {
            id: 'unknown_field_rule',
            description: 'References a field customers never supply',
            condition: { field: 'numberOfCats', operator: 'gte', value: 1 },
            points: 5,
          },
        ];
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/unknown_field_rule/);
    });

    it('finds an unknown field nested inside a group', () => {
      const path = writeMutatedKb((kb) => {
        kb.factors = [
          {
            id: 'nested_unknown',
            description: 'Bad field buried two levels down',
            condition: {
              all: [
                { field: 'propertyType', operator: 'eq', value: 'Flat' },
                { any: [{ field: 'roofMaterial', operator: 'eq', value: 'Thatch' }] },
              ],
            },
            points: 5,
          },
        ];
      });

      expect(() => loadKnowledgeBase(path)).toThrow(KbMalformedError);
      expect(() => loadKnowledgeBase(path)).toThrow(/nested_unknown/);
    });
  });

});
