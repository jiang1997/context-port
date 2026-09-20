import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, unique, uuid, varchar, text, integer } from 'drizzle-orm/pg-core';
import { tasks } from './tasks.js';

export const taskStages = pgTable(
  'task_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('task_stages_position_check', sql`${table.position} >= 0`),
    unique('task_stages_task_id_position_unique').on(table.taskId, table.position),
  ],
);
