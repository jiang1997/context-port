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
    WEB_EXTRA_ORIGINS: z.string().default(''),
    DEPLOYMENT_MODE: z.enum(['local', 'network']).default('local'),
    /** Google OAuth Web client. Auth is optional locally so existing flows keep working. */
    GOOGLE_CLIENT_ID: z.preprocess(value => value === '' ? undefined : value, z.string().optional()),
    GOOGLE_CLIENT_SECRET: z.preprocess(value => value === '' ? undefined : value, z.string().optional()),
    /** Public base URL of this server for building the OAuth redirect URI. */
    PUBLIC_BASE_URL: z.preprocess(value => value === '' ? undefined : value, z.string().url().optional()),
    /** Secure cookie flag: 'auto' enables it outside local development. */
    COOKIE_SECURE: z.enum(['true', 'false', 'auto']).default('auto'),
    LOG_LEVEL: z.preprocess(value => value === 'info' ? 'log' : value, z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log')),
  })
  .superRefine((value, context) => {
    if (value.DEPLOYMENT_MODE === 'local' && value.HOST !== '127.0.0.1') {
      context.addIssue({
        code: 'custom',
        path: ['HOST'],
        message: 'Local mode must bind to 127.0.0.1.',
      });
    }
    const googleKeys = [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.PUBLIC_BASE_URL];
    if (googleKeys.some(Boolean) && !googleKeys.every(Boolean)) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_ID'],
        message: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and PUBLIC_BASE_URL must be set together.',
      });
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

/** Session cookies are Secure unless explicitly disabled or in local dev. */
export function usesSecureCookies(environment: Environment): boolean {
  if (environment.COOKIE_SECURE === 'auto') return environment.DEPLOYMENT_MODE === 'network';
  return environment.COOKIE_SECURE === 'true';
}

/** Primary origin plus comma-separated extras (e.g. Vercel preview deployments). */
export function getAllowedOrigins(environment: Environment): string[] {
  const extras = (environment.WEB_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [environment.WEB_ORIGIN, ...extras];
}

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  cachedEnvironment ??= EnvironmentSchema.parse(process.env);
  return cachedEnvironment;
}
