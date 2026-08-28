import type { RiskBand, RiskKnowledgeBase } from '../kb/kb-schema.ts';

/**
 * Map a risk score onto a band.
 *
 * **No band identifier appears in this file** (Principle I). The highest and
 * lowest bands are identified POSITIONALLY, which is only sound because the KB
 * loader rejects a band list that is not declared in ascending, contiguous
 * order — the two rules exist as a pair.
 */
export function resolveBand(kb: RiskKnowledgeBase, score: number): RiskBand {
  const bands = kb.riskBands;
  const lowest = bands[0];
  const highest = bands[bands.length - 1];

  if (lowest === undefined || highest === undefined) {
    // Unreachable: the schema requires at least one band.
    throw new Error('Knowledge Base declares no risk bands.');
  }

  // Bounds are inclusive at BOTH ends, so a score sitting exactly on a boundary
  // resolves to the band that declares it rather than falling through.
  const matched = bands.find((band) => score >= band.min && score <= band.max);
  if (matched !== undefined) {
    return matched;
  }

  // A score outside the declared range CLAMPS rather than failing: refusing to
  // quote a customer because the rules were tuned to a narrower range would be
  // a worse failure than pricing them at the nearest extreme. Below-range is
  // reachable whenever the KB expresses a discount as negative points.
  return score < lowest.min ? lowest : highest;
}
