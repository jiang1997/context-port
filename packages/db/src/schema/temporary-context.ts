import { check, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const clipboards = pgTable('clipboards', {
  passphraseHash: varchar('passphrase_hash', { length: 64 }).primaryKey(),
  content: text('content').notNull().default(''),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
}, table => [
  check('clipboards_version_positive', sql`${table.version} > 0`),
  index('clipboards_expires_idx').on(table.expiresAt),
]);

export const temporaryContexts = clipboards;
