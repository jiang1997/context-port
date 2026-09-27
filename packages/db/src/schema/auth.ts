import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Account identity. Google `sub` is the stable external key; email is for
 * display and contact only and may change.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleSub: varchar('google_sub', { length: 64 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  name: varchar('name', { length: 300 }),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
}, t => [
  uniqueIndex('users_google_sub_key').on(t.googleSub),
]);

/**
 * Application session. Client browsers hold only an opaque random token; the
 * server stores its SHA-256 hash and revokes the row on logout.
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
}, t => [
  uniqueIndex('sessions_token_hash_key').on(t.tokenHash),
  check('sessions_expiry_after_creation', sql`${t.expiresAt} > ${t.createdAt}`),
]);

/**
 * Personal MCP API keys. Only the SHA-256 digest is stored; the raw key is
 * shown once at creation and prefixed `cpk_` so it never collides with the
 * legacy shared token.
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'string' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
}, t => [
  uniqueIndex('api_keys_token_hash_key').on(t.tokenHash),
  index('api_keys_user_idx').on(t.userId, t.createdAt),
]);

