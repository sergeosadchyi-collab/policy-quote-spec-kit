import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

import type { QuoteResult } from '../models/quote';
import { AppliedFactorsComponent } from '../applied-factors/applied-factors';
import { RiskBandBadgeComponent } from '../risk-band-badge/risk-band-badge';

/**
 * Presentation only — it receives a finished quote and renders it. It performs
 * no arithmetic and holds no risk rule: every figure and every word of risk text
 * is produced by the backend from the Knowledge Base (FR-014a).
 *
 * The coverage breakdown is shown so a customer can reconcile the arithmetic
 * themselves — base × multiplier × load = annual (FR-005a). The numbers are
 * displayed, never recomputed here; if the displayed line did not multiply out,
 * that would be a genuine backend defect and hiding it behind a client-side
 * recalculation would be dishonest.
 */
@Component({
  selector: 'app-quote-result',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RiskBandBadgeComponent, AppliedFactorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './quote-result.css',
  template: `
    <section class="quote-result" aria-live="polite">
      <div class="quote-result__heading">
        <h2 class="quote-result__title">Your indicative quote</h2>
        <app-risk-band-badge
          [riskBand]="quote().riskBand"
          [label]="quote().riskBandLabel"
        />
      </div>

      <p class="quote-result__headline">
        <span class="quote-result__amount">{{
          quote().monthlyPremium | currency: 'GBP' : 'symbol' : '1.2-2'
        }}</span>
        <span class="quote-result__cadence">per month</span>
      </p>

      <p class="quote-result__annual">
        or {{ quote().annualPremium | currency: 'GBP' : 'symbol' : '1.2-2' }} paid annually
      </p>

      <p class="quote-result__summary">{{ quote().riskSummary }}</p>

      <app-applied-factors [factors]="quote().appliedFactors" />

      <div class="breakdown">
        <h3 class="breakdown__title">How we got there</h3>
        <dl class="breakdown__grid">
          <dt>Base premium</dt>
          <dd>{{ quote().coverageDetails.basePremium | currency: 'GBP' : 'symbol' : '1.2-2' }}</dd>

          <dt>Risk score</dt>
          <dd>{{ quote().riskScore }}</dd>

          <dt>Risk multiplier</dt>
          <dd>×{{ quote().coverageDetails.riskMultiplier | number: '1.1-3' }}</dd>

          <dt>Coverage load factor</dt>
          <dd>×{{ quote().coverageDetails.coverageLoadFactor | number: '1.1-3' }}</dd>

          <dt class="breakdown__total-term">Annual premium</dt>
          <dd class="breakdown__total-value">
            {{ quote().coverageDetails.annualPremium | currency: 'GBP' : 'symbol' : '1.2-2' }}
          </dd>
        </dl>
      </div>

      <p class="quote-result__provenance">Priced using rule set {{ quote().kbVersion }}.</p>
    </section>
  `,
})
export class QuoteResultComponent {
  /** Required signal input — this component is never shown without a quote. */
  readonly quote = input.required<QuoteResult>();
}
