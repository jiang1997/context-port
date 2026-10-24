// These optional Nest features are not installed or used by ContextPort.
// Preserve the missing-module behavior when the Worker is bundled.
throw new Error('This optional NestJS dependency is not available in the Workers build.');
export {};
