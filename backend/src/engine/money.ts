/**
 * Monetary rounding.
 *
 * Currency is carried as a `number` of pounds rather than integer pence: the KB
 * authors write `basePremium: 300` and `coverageLoadFactor: 1.2` in pounds, and
 * the calculation is a two-factor product with no accumulation loop, so the
 * boundary conversions would add more surface area than they remove
 * (research R8).
 *
 * What that choice DOES require is care at the rounding step, which is what
 * this module exists to concentrate in one place.
 */

/** A few units in the last place — enough to absorb representation error, far too small to move a real value. */
function nudge(scaled: number, ulps: number): number {
  return scaled + Math.abs(scaled) * Number.EPSILON * ulps;
}

function assertFinite(value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot round a non-finite value to pence: received ${String(value)}.`);
  }
}

/**
 * Round to the nearest penny, halves away from zero.
 *
 * The naive `Math.round(value * 100) / 100` is wrong for exactly the values a
 * customer notices: `1.005` is stored as `1.00499999999999989…`, so it rounds
 * DOWN to `1.00`. Nudging by a few ULPs first makes the behaviour match the
 * arithmetic a human would do by hand, and — being a pure function of the
 * input — keeps output byte-identical across runs as Principle V requires.
 */
export function roundToPence(value: number): number {
  assertFinite(value);

  const scaled = value * 100;
  const magnitude = Math.round(nudge(Math.abs(scaled), 1));

  return (scaled < 0 ? -magnitude : magnitude) / 100;
}

/**
 * Round DOWN to the penny.
 *
 * Used for the monthly instalment. FR-004a requires that twelve instalments
 * never exceed the annual premium, and rounding to the *nearest* penny breaks
 * that: an annual premium of £360.10 gives £30.008…, which would round up to
 * £30.01 and total £360.12. Directed rounding is therefore part of the
 * requirement, not an implementation preference.
 *
 * The nudge matters here too, in the opposite direction: `45.6 * 100` is
 * `4559.999999999999`, and a bare `Math.floor` would drop a penny the customer
 * is entitled to.
 */
export function floorToPence(value: number): number {
  assertFinite(value);

  return Math.floor(nudge(value * 100, 4)) / 100;
}
