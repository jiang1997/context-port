import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { taskStages } from './task-stages.js';
import { tasks } from './tasks.js';

export const contextItems = pgTable(
  'context_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    stageId: uuid('stage_id').references(() => taskStages.id, { onDelete: 'restrict' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 300 }),
    content: text('content').notNull(),
    source: varchar('source', { length: 500 }),
    createdByType: varchar('created_by_type', { length: 16 }).notNull(),
    createdBy: varchar('created_by', { length: 200 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    supersedesContextId: uuid('supersedes_context_id').references(
      (): AnyPgColumn => contextItems.id,
      { onDelete: 'restrict' },
    ),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'context_items_created_by_type_check',
      sql`${table.createdByType} in ('human', 'agent')`,
    ),
    unique('context_items_task_id_idempotency_key_unique').on(
      table.taskId,
      table.idempotencyKey,
    ),
    index('context_items_task_timeline_idx').on(table.taskId, table.createdAt, table.id),
    index('context_items_stage_timeline_idx').on(table.stageId, table.createdAt, table.id),
    index('context_items_task_type_idx').on(table.taskId, table.type),
    index('context_items_supersedes_idx').on(table.supersedesContextId),
  ],
);
