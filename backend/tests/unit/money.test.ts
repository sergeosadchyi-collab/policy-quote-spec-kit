import { floorToPence, roundToPence } from '../../src/engine/money.ts';

/**
 * Money rounding is where "obviously correct" arithmetic quietly goes wrong.
 * These cases pin the two behaviours the premium calculation depends on.
 */
describe('roundToPence', () => {
  it('rounds a half-penny up, which naive Math.round(v * 100) / 100 does not', () => {
    // 1.005 is stored as 1.00499999999999989...; the naive form rounds it DOWN
    // to 1.00, which on a premium is a visible and arguable defect.
    expect(Math.round(1.005 * 100) / 100).toBe(1); // documents the bug being avoided
    expect(roundToPence(1.005)).toBe(1.01);
  });

  it('rounds other representative half-penny values up', () => {
    expect(roundToPence(2.675)).toBe(2.68);
    expect(roundToPence(8.615)).toBe(8.62);
    expect(roundToPence(1.045)).toBe(1.05);
  });

  it('leaves values already at two decimal places untouched', () => {
    expect(roundToPence(360)).toBe(360);
    expect(roundToPence(45.5)).toBe(45.5);
    expect(roundToPence(0)).toBe(0);
  });

  it('absorbs binary floating-point noise', () => {
    expect(roundToPence(0.1 + 0.2)).toBe(0.3);
    expect(roundToPence(29.999999999999996)).toBe(30);
  });

  it('rounds half away from zero for negative values', () => {
    expect(roundToPence(-1.005)).toBe(-1.01);
    expect(roundToPence(-2.344)).toBe(-2.34);
  });

  it('refuses a non-finite value rather than emitting NaN into a premium', () => {
    expect(() => roundToPence(Number.NaN)).toThrow(RangeError);
    expect(() => roundToPence(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('floorToPence', () => {
  it('rounds down, never up', () => {
    expect(floorToPence(30.008333333333333)).toBe(30.0);
    expect(floorToPence(1.009)).toBe(1.0);
    expect(floorToPence(66.999)).toBe(66.99);
  });

  it('leaves an exact pence value alone despite floating-point representation', () => {
    // 45.6 * 100 is 4559.999999999999 in binary floating point; a bare
    // Math.floor would drop a penny the customer is entitled to.
    expect(floorToPence(45.6)).toBe(45.6);
    expect(floorToPence(30)).toBe(30);
    expect(floorToPence(0.3)).toBe(0.3);
  });

  it('refuses a non-finite value', () => {
    expect(() => floorToPence(Number.NaN)).toThrow(RangeError);
  });
});
