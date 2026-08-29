import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { QuoteRequest, QuoteResult } from '../models/quote';

/**
 * The single point of contact with the backend.
 *
 * The URL is deliberately relative. In development the Angular dev-server proxy
 * (`proxy.conf.json`) forwards `/policy/*` to the local Node adapter; in any
 * other environment the same origin serves both. That keeps environment
 * knowledge out of the component tree entirely — no base-URL token, no build
 * flag, nothing to get wrong per environment.
 */
export const QUOTE_ENDPOINT = '/policy/quote';

@Injectable({ providedIn: 'root' })
export class QuoteApi {
  private readonly http = inject(HttpClient);

  /**
   * Returns the raw Observable rather than converting to a signal here.
   *
   * Error handling is a presentation decision — a validation failure and a
   * network failure are shown differently (FR-018, FR-019) — so the component
   * subscribes and decides. Swallowing errors in the service would take that
   * choice away from it.
   */
  requestQuote(request: QuoteRequest): Observable<QuoteResult> {
    return this.http.post<QuoteResult>(QUOTE_ENDPOINT, request);
  }
}
