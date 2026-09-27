import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, integer, timestamp, check, index, unique } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
const documentColumns = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull().default(''),
  version: integer('version').notNull().default(1),
  createdByType: varchar('created_by_type', { length: 16 }).$type<'human' | 'agent'>().notNull(),
  createdBy: varchar('created_by', { length: 200 }),
  updatedByType: varchar('updated_by_type', { length: 16 }).$type<'human' | 'agent'>().notNull(),
  updatedBy: varchar('updated_by', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
});
export const contexts = pgTable('contexts', {
  ...documentColumns(),
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'restrict' }),
}, t => [
  check('contexts_version_positive', sql`${t.version} > 0`),
  check('contexts_actors_valid', sql`${t.createdByType} in ('human', 'agent') and ${t.updatedByType} in ('human', 'agent')`),
  index('contexts_created_idx').on(t.createdAt, t.id),
  index('contexts_owner_idx').on(t.ownerUserId, t.createdAt, t.id),
]);
export const threads = pgTable('threads', {
  ...documentColumns(),
  contextId: uuid('context_id').notNull().references(() => contexts.id, { onDelete: 'restrict' }),
}, t => [
  check('threads_version_positive', sql`${t.version} > 0`),
  check('threads_actors_valid', sql`${t.createdByType} in ('human', 'agent') and ${t.updatedByType} in ('human', 'agent')`),
  index('threads_context_idx').on(t.contextId, t.createdAt, t.id),
]);
export const revisions = pgTable('revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contextId: uuid('context_id').references(() => contexts.id, { onDelete: 'restrict' }),
  threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  createdByType: varchar('created_by_type', { length: 16 }).$type<'human' | 'agent'>().notNull(),
  createdBy: varchar('created_by', { length: 200 }),
  source: varchar('source', { length: 16 }).$type<'rest' | 'mcp'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  check('revisions_one_owner', sql`(${t.contextId} is not null) <> (${t.threadId} is not null)`),
  check('revisions_version_positive', sql`${t.version} > 0`),
  check('revisions_actor_valid', sql`${t.createdByType} in ('human', 'agent')`),
  check('revisions_source_valid', sql`${t.source} in ('rest', 'mcp')`),
  unique('revisions_context_version').on(t.contextId, t.version),
  unique('revisions_thread_version').on(t.threadId, t.version),
]);
