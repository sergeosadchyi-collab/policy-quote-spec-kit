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
  templateUrl: './quote-result.html',
})
export class QuoteResultComponent {
  /** Required signal input — this component is never shown without a quote. */
  readonly quote = input.required<QuoteResult>();
}
