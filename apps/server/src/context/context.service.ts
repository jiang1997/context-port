import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateSharedContextInput,
  type SharedContext,
  type UpdateSharedContextInput,
} from '@contextport/contracts';
import { type Database, sharedContexts } from '@contextport/db';
import { desc, eq, sql } from 'drizzle-orm';
import { DATABASE } from '../db/db.module.js';

type SharedContextRow = typeof sharedContexts.$inferSelect;

function serializeContext(row: SharedContextRow): SharedContext {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

@Injectable()
export class ContextService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<SharedContext[]> {
    const rows = await this.db
      .select()
      .from(sharedContexts)
      .orderBy(desc(sharedContexts.updatedAt));
    return rows.map(serializeContext);
  }

  async get(contextId: string): Promise<SharedContext> {
    const [context] = await this.db
      .select()
      .from(sharedContexts)
      .where(eq(sharedContexts.id, contextId))
      .limit(1);

    if (!context) {
      throw new NotFoundException({
        code: 'CONTEXT_NOT_FOUND',
        message: `Context ${contextId} was not found.`,
      });
    }

    return serializeContext(context);
  }

  async create(input: CreateSharedContextInput): Promise<SharedContext> {
    const [context] = await this.db.insert(sharedContexts).values(input).returning();
    if (!context) throw new Error('The context insert did not return a row.');
    return serializeContext(context);
  }

  async update(
    contextId: string,
    input: UpdateSharedContextInput,
  ): Promise<SharedContext> {
    const [context] = await this.db
      .update(sharedContexts)
      .set({ ...input, updatedAt: sql`now()` })
      .where(eq(sharedContexts.id, contextId))
      .returning();

    if (!context) {
      throw new NotFoundException({
        code: 'CONTEXT_NOT_FOUND',
        message: `Context ${contextId} was not found.`,
      });
    }

    return serializeContext(context);
  }

  async remove(contextId: string): Promise<void> {
    const [deleted] = await this.db
      .delete(sharedContexts)
      .where(eq(sharedContexts.id, contextId))
      .returning({ id: sharedContexts.id });

    if (!deleted) {
      throw new NotFoundException({
        code: 'CONTEXT_NOT_FOUND',
        message: `Context ${contextId} was not found.`,
      });
    }
  }
}
