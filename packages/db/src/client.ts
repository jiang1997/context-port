import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export function createDatabase(databaseUrl: string) {
  // Managed Postgres (Neon / Render) requires TLS; node-postgres does not
  // enable it from `?sslmode=require` alone, so opt in explicitly.
  const useSsl =
    /sslmode=(require|prefer|verify-ca|verify-full)|neon\.tech|render\.com|-pooler\./.test(
      databaseUrl,
    );
  const pool = new Pool({
    connectionString: databaseUrl,
    // Small pool: fits Render free (512MB) and Neon free-tier limits.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const db = drizzle(pool, { schema });

  return { db, pool };
}

export type Database = ReturnType<typeof createDatabase>['db'];
