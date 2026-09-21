import { fileURLToPath } from 'node:url';
import { config as loadEnvironmentFile } from 'dotenv';
import { z } from 'zod';

loadEnvironmentFile({
  path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
  quiet: true,
});

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://contextport:contextport@localhost:5432/context_port'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    HOST: z.string().default('127.0.0.1'),
    WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
    DEPLOYMENT_MODE: z.enum(['local', 'network']).default('local'),
    API_AUTH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    API_AUTH_TOKEN: z.preprocess(value => value === '' ? undefined : value, z.string().min(24).optional()),
    LOG_LEVEL: z.preprocess(value => value === 'info' ? 'log' : value, z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log')),
  })
  .superRefine((value, context) => {
    if (value.DEPLOYMENT_MODE === 'network' && !value.API_AUTH_ENABLED) {
      context.addIssue({
        code: 'custom',
        path: ['API_AUTH_ENABLED'],
        message: 'Network mode requires API authentication.',
      });
    }
    if (value.API_AUTH_ENABLED && !value.API_AUTH_TOKEN) {
      context.addIssue({
        code: 'custom',
        path: ['API_AUTH_TOKEN'],
        message: 'API_AUTH_TOKEN is required when authentication is enabled.',
      });
    }
    if (value.DEPLOYMENT_MODE === 'local' && value.HOST !== '127.0.0.1' && !value.API_AUTH_ENABLED) {
      context.addIssue({
        code: 'custom',
        path: ['HOST'],
        message: 'Unauthenticated local mode must bind to 127.0.0.1.',
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= EnvironmentSchema.parse(process.env);
  return cachedEnvironment;
}
