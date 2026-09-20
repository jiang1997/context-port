import { fileURLToPath } from 'node:url';
import { config as loadEnvironmentFile } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnvironmentFile({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://contextport:contextport@localhost:5432/context_port',
  },
  strict: true,
  verbose: true,
});
