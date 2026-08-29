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
  templateUrl: './applied-factors.html',
})
export class AppliedFactorsComponent {
  readonly factors = input.required<AppliedFactor[]>();
}
