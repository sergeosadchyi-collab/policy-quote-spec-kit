import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The band badge.
 *
 * It receives BOTH the machine id and the customer-facing label, and never maps
 * one to the other. The id is used only to derive a CSS class; the label is the
 * only thing rendered. That split is what lets a pricing specialist add a fourth
 * band to `risk-kb.json` and have it appear correctly — with neutral styling and
 * the KB's own wording — without a single frontend change (FR-006, FR-015).
 *
 * The id is lowercased and non-alphanumerics collapsed to hyphens so an
 * arbitrary KB id cannot inject a malformed class name.
 */
@Component({
  selector: 'app-risk-band-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './risk-band-badge.css',
  template: `<span class="badge" [class]="bandClass()">{{ label() }}</span>`,
})
export class RiskBandBadgeComponent {
  /** Styling hook only — never rendered as text. */
  readonly riskBand = input.required<string>();

  /** Customer-facing wording, taken verbatim from the KB via the API. */
  readonly label = input.required<string>();

  protected readonly bandClass = computed(
    () => `badge--${this.riskBand().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  );
}
