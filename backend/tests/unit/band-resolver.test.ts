import { resolveBand } from '../../src/engine/band-resolver.ts';
import { parsedKb } from '../helpers/kb-fixture.ts';

/**
 * Band resolution must be positional. No test here names a band id that the
 * engine could hardcode against — the expectations are read out of the fixture
 * KB, so `band-resolver.ts` mentioning `HIGH_RISK` would not help it pass
 * (Principle I).
 */
describe('resolveBand', () => {
  const kb = parsedKb();
  const [low, mid, top] = kb.riskBands;

  it('resolves a score comfortably inside a band', () => {
    expect(resolveBand(kb, 5).id).toBe(low?.id);
    expect(resolveBand(kb, 20).id).toBe(mid?.id);
    expect(resolveBand(kb, 60).id).toBe(top?.id);
  });

  it('treats both boundaries as inclusive', () => {
    expect(resolveBand(kb, low?.min ?? 0).id).toBe(low?.id);
    expect(resolveBand(kb, low?.max ?? 0).id).toBe(low?.id);
    expect(resolveBand(kb, mid?.min ?? 0).id).toBe(mid?.id);
    expect(resolveBand(kb, mid?.max ?? 0).id).toBe(mid?.id);
    expect(resolveBand(kb, top?.min ?? 0).id).toBe(top?.id);
    expect(resolveBand(kb, top?.max ?? 0).id).toBe(top?.id);
  });

  it('resolves every integer across the whole declared range without a gap', () => {
    const lowest = low?.min ?? 0;
    const highest = top?.max ?? 0;

    for (let score = lowest; score <= highest; score += 1) {
      expect(() => resolveBand(kb, score)).not.toThrow();
    }
  });

  it('clamps a score above the highest band to that band, rather than failing', () => {
    expect(resolveBand(kb, (top?.max ?? 0) + 1).id).toBe(top?.id);
    expect(resolveBand(kb, 10_000).id).toBe(top?.id);
  });

  it('clamps a score below the lowest band to that band', () => {
    // Reachable because a KB may express a discount as negative points.
    expect(resolveBand(kb, -1).id).toBe(low?.id);
    expect(resolveBand(kb, -500).id).toBe(low?.id);
  });

  it('returns the band exactly as declared in the Knowledge Base', () => {
    expect(resolveBand(kb, 20)).toEqual(mid);
  });

  it('follows a re-banded Knowledge Base with no code change', () => {
    const rebanded = parsedKb((mutable) => {
      const [first, second, third] = mutable.riskBands;
      if (first) first.max = 40;
      if (second) {
        second.min = 41;
        second.max = 60;
      }
      if (third) third.min = 61;
    });

    expect(resolveBand(rebanded, 20).id).toBe(low?.id);
    expect(resolveBand(rebanded, 40).id).toBe(low?.id);
    expect(resolveBand(rebanded, 41).id).toBe(mid?.id);
    expect(resolveBand(rebanded, 61).id).toBe(top?.id);
  });
});
