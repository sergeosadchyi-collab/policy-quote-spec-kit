import { composeSummary, SummaryCompositionError } from '../../src/engine/summary-composer.ts';
import { SUMMARY_PLACEHOLDERS } from '../../src/engine/summary-placeholders.ts';
import { parsedKb } from '../helpers/kb-fixture.ts';
import { aRequest } from '../helpers/request-fixture.ts';

/**
 * All customer-facing risk wording originates in the KB (FR-014a). This suite
 * checks the engine can resolve every placeholder it publishes, and refuses
 * anything it cannot — a half-substituted sentence shown to a customer is
 * worse than a service that refuses to start (FR-014b).
 */
describe('composeSummary', () => {
  const kb = parsedKb();
  const band = kb.riskBands[1];
  if (!band) throw new Error('fixture KB must declare a second band');

  const input = {
    band,
    request: aRequest({ customerName: 'Alice Fairweather', propertyType: 'Flat' as const }),
    riskScore: 37,
    annualPremium: 600,
    monthlyPremium: 50,
    appliedFactors: [
      { id: 'flat', description: 'Flat', points: 12 },
      { id: 'older_or_younger', description: 'Outside the 25-75 age range', points: 25 },
    ],
  };

  it('substitutes every placeholder the engine publishes', () => {
    const template = SUMMARY_PLACEHOLDERS.map((name) => `${name}=<<{{${name}}}>>`).join(' | ');
    const withTemplate = { ...input, band: { ...band, summaryTemplate: template } };

    const summary = composeSummary(withTemplate);

    expect(summary).toContain('customerName=<<Alice Fairweather>>');
    expect(summary).toContain('riskScore=<<37>>');
    expect(summary).toContain(`riskBandLabel=<<${band.label}>>`);
    expect(summary).toContain('annualPremium=<<600.00>>');
    expect(summary).toContain('monthlyPremium=<<50.00>>');
    expect(summary).toContain('appliedFactorCount=<<2>>');
    expect(summary).toContain('propertyType=<<Flat>>');
    expect(summary).not.toContain('{{');
  });

  it('formats monetary placeholders to two decimal places', () => {
    const withTemplate = {
      ...input,
      annualPremium: 360.5,
      monthlyPremium: 30,
      appliedFactors: [],
      band: { ...band, summaryTemplate: '{{annualPremium}} / {{monthlyPremium}}' },
    };

    expect(composeSummary(withTemplate)).toBe('360.50 / 30.00');
  });

  it('tolerates whitespace inside the placeholder braces', () => {
    const withTemplate = { ...input, band: { ...band, summaryTemplate: 'Hi {{ customerName }}.' } };

    expect(composeSummary(withTemplate)).toContain('Hi Alice Fairweather.');
  });

  it('appends the applied factor descriptions verbatim from the KB', () => {
    const summary = composeSummary(input);

    for (const factor of input.appliedFactors) {
      expect(summary).toContain(factor.description);
    }
  });

  it('appends nothing when no factor applied, rather than authoring an excuse', () => {
    const summary = composeSummary({ ...input, appliedFactors: [] });
    const substitutedOnly = composeSummary({
      ...input,
      appliedFactors: [],
      band: { ...band, summaryTemplate: band.summaryTemplate },
    });

    expect(summary).toBe(substitutedOnly);
    expect(summary).not.toMatch(/factors applied/i);
  });

  it('raises rather than substituting an unknown placeholder with empty text', () => {
    const withTemplate = {
      ...input,
      band: { ...band, summaryTemplate: 'Hello {{customerName}}, band {{riskBandLable}}.' },
    };

    expect(() => composeSummary(withTemplate)).toThrow(SummaryCompositionError);
    expect(() => composeSummary(withTemplate)).toThrow(/riskBandLable/);
  });

  it('contains no risk wording of its own — the band template drives everything', () => {
    const withTemplate = { ...input, band: { ...band, summaryTemplate: 'ONLY-THIS' } };

    const summary = composeSummary({ ...withTemplate, appliedFactors: [] });

    expect(summary).toBe('ONLY-THIS');
  });
});
