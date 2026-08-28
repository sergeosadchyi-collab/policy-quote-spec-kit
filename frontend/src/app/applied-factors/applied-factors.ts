import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AppliedFactor } from '../models/quote';

/**
 * Renders the factors that actually contributed to the score.
 *
 * Every word of every description is printed verbatim as it arrived from the
 * API, which took it verbatim from the Knowledge Base. There is deliberately no
 * id→text map, no dictionary and no `switch` in this file: retuning a factor's
 * wording is a KB edit, and if this component paraphrased anything, that edit
 * would silently fail to reach the customer (FR-016, SC-005).
 *
 * The empty state is explicit rather than an absent section. "No risk factors
 * applied" is itself an explanation, and a customer who sees nothing cannot tell
 * whether the answer was "none" or whether the page is broken.
 */
@Component({
  selector: 'app-applied-factors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './applied-factors.css',
  template: `
    <section class="factors">
      <h3 class="factors__title">Why we priced it this way</h3>

      @if (factors().length > 0) {
        <ul class="factors__list">
          @for (factor of factors(); track factor.id) {
            <li class="factors__item">
              <span class="factors__description">{{ factor.description }}</span>
              <span class="factors__points">+{{ factor.points }}</span>
            </li>
          }
        </ul>
      } @else {
        <p class="factors__empty">
          No risk factors applied — your details did not trigger any of our risk rules.
        </p>
      }
    </section>
  `,
})
export class AppliedFactorsComponent {
  readonly factors = input.required<AppliedFactor[]>();
}
