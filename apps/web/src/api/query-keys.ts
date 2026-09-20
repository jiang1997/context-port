export const queryKeys = {
  tasks: (filters: Record<string, unknown> = {}) => ['tasks', filters] as const,
  task: (taskId: string) => ['task', taskId] as const,
  contexts: (taskId: string, filters: Record<string, unknown> = {}) =>
    ['task-contexts', taskId, filters] as const,
};
