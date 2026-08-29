/**
 * Knowledge Base failure taxonomy.
 *
 * These are three distinct classes rather than one error with a `kind` field
 * because the spec treats them as three distinct edge cases requiring three
 * different operator responses: a missing file is a deployment problem, a
 * malformed file is an authoring problem, and an unsupported version is a
 * compatibility problem that must NOT be silently coerced (FR-013b).
 */

export class KbNotFoundError extends Error {
  readonly filePath: string;

  constructor(filePath: string, cause?: unknown) {
    super(`Knowledge Base file could not be read at "${filePath}".`);
    this.name = 'KbNotFoundError';
    this.filePath = filePath;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class KbMalformedError extends Error {
  readonly filePath: string;

  /** Human-readable locations of the offending nodes, e.g. `factors[2].condition`. */
  readonly problems: readonly string[];

  constructor(filePath: string, problems: readonly string[]) {
    super(
      `Knowledge Base at "${filePath}" is invalid:\n` +
        problems.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'KbMalformedError';
    this.filePath = filePath;
    this.problems = problems;
  }
}

export class KbUnsupportedVersionError extends Error {
  readonly filePath: string;
  readonly versionFound: string;
  readonly rangeExpected: string;

  constructor(filePath: string, versionFound: string, rangeExpected: string) {
    super(
      `Knowledge Base at "${filePath}" declares version "${versionFound}", ` +
        `which is outside the supported range "${rangeExpected}". ` +
        `The version is not coerced or downgraded — update the service or the rules file.`,
    );
    this.name = 'KbUnsupportedVersionError';
    this.filePath = filePath;
    this.versionFound = versionFound;
    this.rangeExpected = rangeExpected;
  }
}
