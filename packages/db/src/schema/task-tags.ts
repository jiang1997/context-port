import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { tasks } from './tasks.js';

export const taskTags = pgTable(
  'task_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    createdByType: varchar('created_by_type', { length: 16 }).notNull(),
    createdBy: varchar('created_by', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('task_tags_created_by_type_check', sql`${table.createdByType} in ('human', 'agent')`),
    unique('task_tags_task_id_name_unique').on(table.taskId, table.name),
    index('task_tags_name_idx').on(table.name),
  ],
);
