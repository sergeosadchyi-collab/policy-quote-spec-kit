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
  template: `
    <header class="masthead">
      <p class="masthead__brand">PolicyQuote</p>
      <h1 class="masthead__title">Home insurance, priced in seconds</h1>
      <p class="masthead__strapline">
        Tell us about you and your property and we will show you an indicative premium — and
        exactly how we arrived at it.
      </p>
    </header>

    <main class="layout">
      <app-quote-form (quoted)="onQuoted($event)" />

      @if (quote(); as result) {
        <app-quote-result [quote]="result" />
      } @else {
        <section class="placeholder">
          <p>Your quote will appear here once you submit your details.</p>
        </section>
      }
    </main>

    <footer class="colophon">
      <p>Indicative quote only. Not a contract of insurance.</p>
    </footer>
  `,
})
export class App {
  protected readonly quote = signal<QuoteResult | null>(null);

  protected onQuoted(result: QuoteResult | null): void {
    this.quote.set(result);
  }
}
