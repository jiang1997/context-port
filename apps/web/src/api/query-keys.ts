export const queryKeys = {
  contexts: () => ['contexts'] as const,
  context: (contextId: string) => ['context', contextId] as const,
};
