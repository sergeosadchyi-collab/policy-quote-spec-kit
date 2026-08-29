import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import type { QuoteResult } from './models/quote';
import { QuoteFormComponent } from './quote-form/quote-form';
import { QuoteResultComponent } from './quote-result/quote-result';

/**
 * Root shell. Standalone, OnPush, hand-authored CSS — no NgModule and no UI
 * component library anywhere in this application (Principles II and V).
 *
 * It owns exactly one piece of state: the most recent quote. The form produces
 * it, the result component renders it, and neither needs to know about the
 * other.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuoteFormComponent, QuoteResultComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly quote = signal<QuoteResult | null>(null);

  protected onQuoted(result: QuoteResult | null): void {
    this.quote.set(result);
  }
}
