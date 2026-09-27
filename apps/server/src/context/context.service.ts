import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, isNull } from 'drizzle-orm';
import { contexts, threads, revisions, type Database } from '@contextport/db';
import { CreateContextSchema, ListContextsSchema, type CreateContextInput } from '@contextport/contracts';
import { DATABASE } from '../db/db.module.js';

type Source = 'rest' | 'mcp';

/**
 * All public methods take the caller's user ID (from the server-side
 * identity, never client input) and scope every query to it. Cross-user
 * access returns 404 so record existence is not leaked. A userId of
 * undefined is only the transitional pre-migration mode (legacy token or
 * local dev) where pre-ownership rows stay readable.
 */
@Injectable()
export class ContextService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(userId: string | undefined, input: { limit?: number; offset?: number } = {}) {
    const { limit, offset } = ListContextsSchema.parse(input);
    const { content: _, ...summary } = getTableColumns(contexts);
    return this.db.select(summary).from(contexts)
      .where(and(this.ownership(userId), isNull(contexts.archivedAt)))
      .orderBy(desc(contexts.createdAt), desc(contexts.id)).limit(limit).offset(offset);
  }

  async get(userId: string | undefined, id: string) {
    const [context] = await this.db.select().from(contexts)
      .where(and(eq(contexts.id, id), this.ownership(userId)));
    if (!context) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Context not found.' });
    const { content: _, ...summary } = getTableColumns(threads);
    const index = await this.db.select(summary).from(threads)
      .where(and(eq(threads.contextId, id), isNull(threads.archivedAt)))
      .orderBy(asc(threads.createdAt), asc(threads.id));
    return { ...context, threads: index };
  }

  async getThread(userId: string | undefined, contextId: string, threadId: string) {
    // Threads inherit ownership through their parent Context, so ownership
    // checks join the parent row rather than trusting the thread alone.
    const filters = [eq(threads.contextId, contextId), eq(threads.id, threadId)];
    filters.push(userId === undefined ? isNull(contexts.ownerUserId) : eq(contexts.ownerUserId, userId));
    const [row] = await this.db.select({ thread: threads })
      .from(threads)
      .innerJoin(contexts, eq(threads.contextId, contexts.id))
      .where(and(...filters));
    if (!row) throw new NotFoundException({ code: 'THREAD_NOT_FOUND', message: 'Thread not found in this Context.' });
    return row.thread;
  }

  async create(userId: string | undefined, input: CreateContextInput, source: Source) {
    const data = CreateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [context] = await tx.insert(contexts).values({ ...data,
        ...(userId === undefined ? {} : { ownerUserId: userId }),
        updatedByType: data.createdByType, updatedBy: data.createdBy ?? null }).returning();
      if (!context) throw new Error('Context insert failed.');
      await tx.insert(revisions).values({ contextId: context.id, version: context.version,
        title: context.title, content: context.content, createdByType: context.createdByType,
        createdBy: context.createdBy, source });
      return { ...context, threads: [] };
    });
  }

  async createThread(userId: string | undefined, contextId: string, input: CreateContextInput, source: Source) {
    const data = CreateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [parent] = await tx.select({ id: contexts.id }).from(contexts)
        .where(and(eq(contexts.id, contextId), isNull(contexts.archivedAt), this.ownership(userId))).for('share');
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

  private ownership(userId: string | undefined) {
    // Pre-migration mode (anonymous/legacy token) only reaches ownerless rows;
    // owned rows are invisible until phase 4 binds the legacy token to an owner.
    return userId === undefined ? isNull(contexts.ownerUserId) : eq(contexts.ownerUserId, userId);
  }
}
