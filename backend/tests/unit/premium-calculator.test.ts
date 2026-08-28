import { calculatePremium } from '../../src/engine/premium-calculator.ts';
import { parsedKb } from '../helpers/kb-fixture.ts';

/**
 * The premium formula and its two — and only two — rounding points (FR-004a,
 * FR-004b). Expected figures are computed from the fixture KB rather than
 * written as literals, so a hardcoded premium in the engine cannot pass.
 */
describe('calculatePremium', () => {
  const kb = parsedKb();

  it('multiplies base premium by the band multiplier and the coverage load', () => {
    for (const band of kb.riskBands) {
      const expected = kb.basePremium * band.riskMultiplier * kb.coverageLoadFactor;

      expect(calculatePremium(kb, band).annualPremium).toBeCloseTo(expected, 2);
    }
  });

  it('reports a coverage breakdown that reproduces the annual premium', () => {
    const band = kb.riskBands[1];
    if (!band) throw new Error('fixture KB must declare a second band');

    const { coverageDetails, annualPremium } = calculatePremium(kb, band);

    expect(coverageDetails.basePremium).toBe(kb.basePremium);
    expect(coverageDetails.riskMultiplier).toBe(band.riskMultiplier);
    expect(coverageDetails.coverageLoadFactor).toBe(kb.coverageLoadFactor);
    expect(coverageDetails.annualPremium).toBe(annualPremium);

    const reconstructed =
      coverageDetails.basePremium *
      coverageDetails.riskMultiplier *
      coverageDetails.coverageLoadFactor;
    expect(reconstructed).toBeCloseTo(annualPremium, 2);
  });

  it('rounds both figures to at most two decimal places', () => {
    const awkward = parsedKb((mutable) => {
      mutable.basePremium = 333.33;
      mutable.coverageLoadFactor = 1.17;
    });

    for (const band of awkward.riskBands) {
      const { annualPremium, monthlyPremium } = calculatePremium(awkward, band);

      expect(annualPremium).toBe(Number(annualPremium.toFixed(2)));
      expect(monthlyPremium).toBe(Number(monthlyPremium.toFixed(2)));
    }
  });

  it('guarantees twelve instalments never exceed the annual premium (FR-004a)', () => {
    // The property that forces the monthly figure to round DOWN: rounding to
    // the nearest penny would let 12 instalments overshoot by up to 11p.
    for (let basePremium = 100; basePremium <= 140; basePremium += 0.37) {
      const variant = parsedKb((mutable) => {
        mutable.basePremium = Number(basePremium.toFixed(2));
      });

      for (const band of variant.riskBands) {
        const { annualPremium, monthlyPremium } = calculatePremium(variant, band);

        expect(monthlyPremium * 12).toBeLessThanOrEqual(annualPremium + 1e-9);
      }
    }
  });

  it('keeps the monthly figure within a penny of an exact twelfth', () => {
    for (const band of kb.riskBands) {
      const { annualPremium, monthlyPremium } = calculatePremium(kb, band);

      expect(annualPremium / 12 - monthlyPremium).toBeGreaterThanOrEqual(-1e-9);
      expect(annualPremium / 12 - monthlyPremium).toBeLessThan(0.01);
    }
  });

  it('does not round the multiplier product before the annual premium', () => {
    // basePremium x multiplier is 150.555 here; rounding it early would give
    // 150.56 x 1.5 = 225.84 rather than the correct 225.83.
    const precise = parsedKb((mutable) => {
      mutable.basePremium = 100.37;
      mutable.coverageLoadFactor = 1.5;
      const band = mutable.riskBands[0];
      if (band) band.riskMultiplier = 1.5;
    });
    const band = precise.riskBands[0];
    if (!band) throw new Error('fixture KB must declare a first band');

    expect(calculatePremium(precise, band).annualPremium).toBe(225.83);
  });

  it('follows a repriced Knowledge Base with no code change', () => {
    const repriced = parsedKb((mutable) => {
      mutable.basePremium = 400;
    });
    const band = repriced.riskBands[0];
    if (!band) throw new Error('fixture KB must declare a first band');

    expect(calculatePremium(repriced, band).annualPremium).toBe(
      400 * band.riskMultiplier * repriced.coverageLoadFactor,
    );
  });
});
