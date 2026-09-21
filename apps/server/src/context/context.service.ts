import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, isNull } from 'drizzle-orm';
import { contexts, threads, revisions, type Database } from '@contextport/db';
import { CreateContextSchema, ListContextsSchema, type CreateContextInput } from '@contextport/contracts';
import { DATABASE } from '../db/db.module.js';

type Source = 'rest' | 'mcp';
@Injectable()
export class ContextService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(input: { limit?: number; offset?: number } = {}) {
    const { limit, offset } = ListContextsSchema.parse(input);
    const { content: _, ...summary } = getTableColumns(contexts);
    return this.db.select(summary).from(contexts).where(isNull(contexts.archivedAt))
      .orderBy(desc(contexts.createdAt), desc(contexts.id)).limit(limit).offset(offset);
  }

  async get(id: string) {
    const [context] = await this.db.select().from(contexts).where(eq(contexts.id, id));
    if (!context) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Context not found.' });
    const { content: _, ...summary } = getTableColumns(threads);
    const index = await this.db.select(summary).from(threads)
      .where(and(eq(threads.contextId, id), isNull(threads.archivedAt)))
      .orderBy(asc(threads.createdAt), asc(threads.id));
    return { ...context, threads: index };
  }

  async getThread(contextId: string, threadId: string) {
    const [thread] = await this.db.select().from(threads)
      .where(and(eq(threads.contextId, contextId), eq(threads.id, threadId)));
    if (!thread) throw new NotFoundException({ code: 'THREAD_NOT_FOUND', message: 'Thread not found in this Context.' });
    return thread;
  }

  async create(input: CreateContextInput, source: Source) {
    const data = CreateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [context] = await tx.insert(contexts).values({ ...data,
        updatedByType: data.createdByType, updatedBy: data.createdBy ?? null }).returning();
      if (!context) throw new Error('Context insert failed.');
      await tx.insert(revisions).values({ contextId: context.id, version: context.version,
        title: context.title, content: context.content, createdByType: context.createdByType,
        createdBy: context.createdBy, source });
      return { ...context, threads: [] };
    });
  }

  async createThread(contextId: string, input: CreateContextInput, source: Source) {
    const data = CreateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [parent] = await tx.select({ id: contexts.id }).from(contexts)
        .where(and(eq(contexts.id, contextId), isNull(contexts.archivedAt))).for('share');
      if (!parent) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Active Context not found.' });
      const [thread] = await tx.insert(threads).values({ ...data, contextId,
        updatedByType: data.createdByType, updatedBy: data.createdBy ?? null }).returning();
      if (!thread) throw new Error('Thread insert failed.');
      await tx.insert(revisions).values({ threadId: thread.id, version: thread.version,
        title: thread.title, content: thread.content, createdByType: thread.createdByType,
        createdBy: thread.createdBy, source });
      return thread;
    });
  }
}
