import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const sharedContexts = pgTable(
  'shared_contexts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('shared_contexts_updated_at_id_idx').on(table.updatedAt.desc(), table.id.desc())],
);
