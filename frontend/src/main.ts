import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';

/**
 * Zoneless bootstrap (Constitution Principle II).
 *
 * `zone.js` is not loaded at all: change detection is driven entirely by
 * Signals, which is only coherent if no component relies on Zone-based
 * monkey-patching. Providing this here — rather than in a separate config
 * module — keeps a single source of truth for how the application starts.
 */
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection(), provideHttpClient()],
}).catch((err: unknown) => {
  console.error(err);
});
