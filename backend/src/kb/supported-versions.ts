/**
 * The KB version range this build of the service understands.
 *
 * Declared as a constant rather than read from configuration so that
 * compatibility is a property of the deployed code, not of the environment —
 * an environment variable could silently widen it and let an incompatible
 * rules file through (Principle V forbids environment lookups in the pipeline).
 *
 * The range means: additive rules revisions (PATCH and MINOR) keep working with
 * no redeployment, while a schema-breaking revision (MAJOR) stops the service
 * loudly rather than mis-pricing against rules it cannot fully interpret
 * (FR-013a, FR-013b).
 */
export const SUPPORTED_KB_VERSION_RANGE = '>=1.0.0 <2.0.0';
