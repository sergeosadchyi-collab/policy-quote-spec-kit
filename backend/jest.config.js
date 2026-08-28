/**
 * Jest configuration for the PolicyQuote backend.
 *
 * The backend is native ESM (`"type": "module"`) so that `node src/server.ts`
 * can rely on Node's built-in TypeScript type stripping and run with no build
 * step. Jest therefore runs in ESM mode via `--experimental-vm-modules`, with
 * ts-jest transpiling test and source files.
 *
 * Relative imports carry an explicit `.ts` extension (required by native type
 * stripping under NodeNext resolution); those specifiers resolve directly
 * because the files exist on disk under that exact name.
 */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // ts-jest rewrites `./x.ts` specifiers to `./x.js` on emit; map them back to
  // the extensionless form so Jest resolves the real `.ts` source on disk.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // ts-jest emits the modules Jest's ESM runtime consumes; the root
          // tsconfig is `noEmit` for type-checking only.
          module: 'ESNext',
          target: 'ES2023',
          moduleResolution: 'Bundler',
          allowImportingTsExtensions: true,
          verbatimModuleSyntax: false,
          erasableSyntaxOnly: true,
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};
