import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, isNull } from 'drizzle-orm';
import { contexts, threads, revisions, type Database } from '@contextport/db';
import { CreateContextSchema, ListContextsSchema, UpdateContextSchema, UpdateThreadSchema, type CreateContextInput, type UpdateContextInput, type UpdateThreadInput } from '@contextport/contracts';
import { DATABASE } from '../db/db.module.js';

type Source = 'rest' | 'mcp';

/**
 * All public methods take the caller's user ID (from the server-side
 * identity, never client input) and scope every query to it. Cross-user
 * access returns 404 so record existence is not leaked.
 */
@Injectable()
export class ContextService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(userId: string, input: { limit?: number; offset?: number } = {}) {
    const { limit, offset } = ListContextsSchema.parse(input);
    const { content: _, ...summary } = getTableColumns(contexts);
    return this.db.select(summary).from(contexts)
      .where(and(this.ownership(userId), isNull(contexts.archivedAt)))
      .orderBy(desc(contexts.createdAt), desc(contexts.id)).limit(limit).offset(offset);
  }

  async get(userId: string, id: string) {
    const [context] = await this.db.select().from(contexts)
      .where(and(eq(contexts.id, id), this.ownership(userId)));
    if (!context) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Context not found.' });
    const { content: _, ...summary } = getTableColumns(threads);
    const index = await this.db.select(summary).from(threads)
      .where(and(eq(threads.contextId, id), isNull(threads.archivedAt)))
      .orderBy(asc(threads.createdAt), asc(threads.id));
    return { ...context, threads: index };
  }

  async getThread(userId: string, contextId: string, threadId: string) {
    // Threads inherit ownership through their parent Context, so ownership
    // checks join the parent row rather than trusting the thread alone.
    const filters = [eq(threads.contextId, contextId), eq(threads.id, threadId)];
    filters.push(eq(contexts.ownerUserId, userId));
    const [row] = await this.db.select({ thread: threads })
      .from(threads)
      .innerJoin(contexts, eq(threads.contextId, contexts.id))
      .where(and(...filters));
    if (!row) throw new NotFoundException({ code: 'THREAD_NOT_FOUND', message: 'Thread not found in this Context.' });
    return row.thread;
  }

  async create(userId: string, input: CreateContextInput, source: Source) {
    const data = CreateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [context] = await tx.insert(contexts).values({ ...data,
        ownerUserId: userId,
        updatedByType: data.createdByType, updatedBy: data.createdBy ?? null }).returning();
      if (!context) throw new Error('Context insert failed.');
      await tx.insert(revisions).values({ contextId: context.id, version: context.version,
        title: context.title, content: context.content, createdByType: context.createdByType,
        createdBy: context.createdBy, source });
      return { ...context, threads: [] };
    });
  }

  async createThread(userId: string, contextId: string, input: CreateContextInput, source: Source) {
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

  async updateThread(userId: string, contextId: string, threadId: string, input: UpdateThreadInput, source: Source) {
    const data = UpdateThreadSchema.parse(input);
    return this.db.transaction(async tx => {
      const [current] = await tx.select().from(threads)
        .innerJoin(contexts, eq(threads.contextId, contexts.id))
        .where(and(eq(threads.contextId, contextId), eq(threads.id, threadId), eq(contexts.ownerUserId, userId)))
        .then(rows => rows.map(r => r.threads));
      if (!current) throw new NotFoundException({ code: 'THREAD_NOT_FOUND', message: 'Thread not found in this Context.' });
      if (current.archivedAt) throw new NotFoundException({ code: 'THREAD_NOT_FOUND', message: 'Thread not found in this Context.' });
      if (current.version !== data.expectedVersion) {
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version conflict. Re-read, merge, then retry.',
          details: { expectedVersion: data.expectedVersion, currentVersion: current.version } });
      }
      const [updated] = await tx.update(threads).set({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        version: current.version + 1,
        updatedByType: data.updatedByType, updatedBy: data.updatedBy ?? null,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(threads.id, threadId), eq(threads.version, data.expectedVersion))).returning();
      if (!updated) {
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version conflict. Re-read, merge, then retry.',
          details: { expectedVersion: data.expectedVersion } });
      }
      await tx.insert(revisions).values({ threadId: updated.id, version: updated.version,
        title: updated.title, content: updated.content, createdByType: updated.updatedByType,
        createdBy: updated.updatedBy, source });
      return updated;
    });
  }

  async update(userId: string, id: string, input: UpdateContextInput, source: Source) {
    const data = UpdateContextSchema.parse(input);
    return this.db.transaction(async tx => {
      const [current] = await tx.select().from(contexts)
        .where(and(eq(contexts.id, id), this.ownership(userId)));
      if (!current) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Context not found.' });
      if (current.archivedAt) throw new NotFoundException({ code: 'CONTEXT_NOT_FOUND', message: 'Context not found.' });
      if (current.version !== data.expectedVersion) {
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version conflict. Re-read, merge, then retry.',
          details: { expectedVersion: data.expectedVersion, currentVersion: current.version } });
      }
      const [updated] = await tx.update(contexts).set({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        version: current.version + 1,
        updatedByType: data.updatedByType, updatedBy: data.updatedBy ?? null,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(contexts.id, id), eq(contexts.version, data.expectedVersion))).returning();
      if (!updated) {
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version conflict. Re-read, merge, then retry.',
          details: { expectedVersion: data.expectedVersion } });
      }
      await tx.insert(revisions).values({ contextId: updated.id, version: updated.version,
        title: updated.title, content: updated.content, createdByType: updated.updatedByType,
        createdBy: updated.updatedBy, source });
      const { content: _, ...summary } = getTableColumns(threads);
      const index = await tx.select(summary).from(threads)
        .where(and(eq(threads.contextId, id), isNull(threads.archivedAt)))
        .orderBy(asc(threads.createdAt), asc(threads.id));
      return { ...updated, threads: index };
    });
  }

  private ownership(userId: string) {
    return eq(contexts.ownerUserId, userId);
  }
}
