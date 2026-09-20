import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    handoffContextId: uuid('handoff_context_id'),
    idempotencyKey: uuid('idempotency_key').notNull().unique(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    createdByType: varchar('created_by_type', { length: 16 }).notNull(),
    createdBy: varchar('created_by', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('tasks_created_by_type_check', sql`${table.createdByType} in ('human', 'agent')`),
    index('tasks_updated_at_id_idx').on(table.updatedAt.desc(), table.id.desc()),
  ],
);
