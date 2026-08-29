import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';

import type {
  PropertyType,
  QuoteRequest,
  QuoteResult,
  ValidationErrorResponse,
} from '../models/quote';
import { QuoteApi } from '../services/quote-api';
import {
  AGE_VALIDATORS,
  CLIENT_MESSAGES,
  NAME_VALIDATORS,
  PREVIOUS_CLAIMS_VALIDATORS,
  PROPERTY_VALUE_VALIDATORS,
  RANGE_MESSAGES,
  postcodeValidator,
} from './quote-validators';

/** Offered to the customer as a closed list; the KB decides what they mean. */
const PROPERTY_TYPES: readonly PropertyType[] = ['House', 'Flat', 'Bungalow'];

type FieldName = keyof QuoteRequest;

const FIELDS: readonly FieldName[] = [
  'customerName',
  'age',
  'propertyType',
  'propertyValue',
  'postcode',
  'previousClaims',
];

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './quote-form.css',
  templateUrl: './quote-form.html',
})
export class QuoteFormComponent {
  private readonly api = inject(QuoteApi);
  private readonly fb = inject(FormBuilder);

  protected readonly propertyTypes = PROPERTY_TYPES;

  /**
   * Local UI state as signals — no `BehaviorSubject`, no `Subject` (Principle
   * II).
   */
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Field errors returned by the SERVER, keyed by field name.
   *
   * Held separately from the reactive form's own errors because they have a
   * different lifetime: a server rule the client does not mirror (or a rule
   * added to the backend later) must still produce a message attached to the
   * right input, and it must clear as soon as that input is edited.
   */
  private readonly serverIssues = signal<Record<string, string>>({});

  /** Emitted on success; cleared upstream on failure so no stale quote is shown. */
  readonly quoted = output<QuoteResult | null>();

  protected readonly form = this.fb.nonNullable.group({
    customerName: ['', NAME_VALIDATORS],
    age: [40, AGE_VALIDATORS],
    propertyType: ['House' as PropertyType, Validators.required],
    propertyValue: [250000, PROPERTY_VALUE_VALIDATORS],
    postcode: ['', postcodeValidator],
    previousClaims: [0, PREVIOUS_CLAIMS_VALIDATORS],
  });

  private readonly status = signal(this.form.status);
  private readonly touchedTick = signal(0);

  /** Gates the submit button: never submit an invalid form or a second request. */
  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !this.loading());

  constructor() {
    this.form.statusChanges.subscribe(() => {
      this.status.set(this.form.status);
      this.touchedTick.update((tick) => tick + 1);
    });

    // A server complaint about a field stops applying the moment the customer
    // edits that field — the server has not seen the new value, so continuing
    // to show its verdict would be wrong.
    for (const field of FIELDS) {
      // Typed as the base class: the controls union has incompatible
      // `subscribe` overloads, and nothing here needs the specific value type.
      const control: AbstractControl = this.form.controls[field];

      control.valueChanges.subscribe(() => {
        if (this.serverIssues()[field] !== undefined) {
          this.serverIssues.update(({ [field]: _removed, ...rest }) => rest);
        }
      });
    }
  }

  /**
   * The single message shown beneath a field, from whichever source produced it.
   *
   * Server issues win: the server is the authority, and if it rejected a value
   * the client considered acceptable, its reason is the one worth reading.
   */
  protected messageFor(field: FieldName): string | null {
    const fromServer = this.serverIssues()[field];
    if (fromServer !== undefined) {
      return fromServer;
    }

    // Depend on the tick so the computed message refreshes as validity changes.
    this.touchedTick();

    const control = this.form.controls[field];
    if (!control.touched || control.valid || control.errors === null) {
      return null;
    }

    return firstMessage(control.errors);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      this.touchedTick.update((tick) => tick + 1);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.serverIssues.set({});

    const request = this.form.getRawValue() satisfies QuoteRequest;

    this.api.requestQuote(request).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.quoted.emit(result);
      },
      error: (error: unknown) => {
        // Loading is cleared on EVERY failure path, so the form is always
        // usable again and the customer can retry without reloading (FR-018).
        this.loading.set(false);
        // A failed attempt must not leave a previous quote on screen looking
        // like the answer to the details now in the form.
        this.quoted.emit(null);
        this.handleFailure(error);
      },
    });
  }

  private handleFailure(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorMessage.set('Something went wrong. Please try again.');
      return;
    }

    // Status 0 means the request never reached the server: offline, DNS
    // failure, or the backend not running. That is a different message from a
    // server that answered with an error (FR-018).
    if (error.status === 0) {
      this.errorMessage.set(
        'We could not reach the quoting service. Please check your connection and try again.',
      );
      return;
    }

    if (error.status === 400) {
      const issues = validationIssuesOf(error.error);
      if (issues !== null) {
        this.serverIssues.set(issues);
        this.touchedTick.update((tick) => tick + 1);
        this.errorMessage.set('Please correct the highlighted fields.');
        return;
      }
    }

    this.errorMessage.set('We could not calculate your quote. Please try again shortly.');
  }
}

/** Narrows an untyped error payload to the published validation shape. */
function validationIssuesOf(payload: unknown): Record<string, string> | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const { issues } = payload as Partial<ValidationErrorResponse>;
  if (!Array.isArray(issues) || issues.length === 0) {
    return null;
  }

  const mapped: Record<string, string> = {};
  for (const issue of issues) {
    if (typeof issue?.field === 'string' && typeof issue?.message === 'string') {
      mapped[issue.field] = issue.message;
    }
  }

  return Object.keys(mapped).length > 0 ? mapped : null;
}

/** One message per field: several complaints about one input reads as a malfunction. */
function firstMessage(errors: Record<string, unknown>): string {
  for (const [key, detail] of Object.entries(errors)) {
    const range = RANGE_MESSAGES[key];
    if (range !== undefined && typeof detail === 'object' && detail !== null) {
      const bound = (detail as { min?: unknown; max?: unknown })[key as 'min' | 'max'];
      if (typeof bound === 'number') {
        return range(bound);
      }
    }

    const message = CLIENT_MESSAGES[key];
    if (message !== undefined) {
      return message;
    }
  }

  return 'Please check this value.';
}
