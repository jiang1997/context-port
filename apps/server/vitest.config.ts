import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Integration files share one disposable PostgreSQL database; run files
  // sequentially so TRUNCATE-based cleanup cannot race across workers.
  test: { fileParallelism: false },
});
