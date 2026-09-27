import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { Global, Module, type ExecutionContext, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createDatabase, revisions, users } from '@contextport/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE } from '../db/db.module.js';
import { ContextModule } from './context.module.js';
import { McpModule } from '../mcp/mcp.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { identity } from '../auth/auth-identity.js';

// Only use a dedicated disposable database; migrations never run against DATABASE_URL here.
describe.skipIf(!process.env.TEST_DATABASE_URL)('Context MVP integration', () => {
  let app: INestApplication;
  let bundle: ReturnType<typeof createDatabase>;
  let client: Client;
  let testUserId: string;
  beforeAll(async () => {
    bundle = createDatabase(process.env.TEST_DATABASE_URL!);
    await migrate(bundle.db, { migrationsFolder: fileURLToPath(new URL('../../../../packages/db/migrations', import.meta.url)) });
    await bundle.db.execute(sql`TRUNCATE revisions, threads, contexts, api_keys, sessions, users`);
    const [testUser] = await bundle.db.insert(users).values({ googleSub: 'context-integration', email: 'context@example.com' }).returning();
    testUserId = testUser!.id;
    @Global()
    @Module({ providers: [{ provide: DATABASE, useValue: bundle.db }], exports: [DATABASE] })
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({
      imports: [TestDatabaseModule, ContextModule, McpModule],
      providers: [{ provide: APP_GUARD, useValue: { canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().authIdentity = identity(testUserId, 'session');
        return true;
      } } }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    client = new Client({ name: 'mvp-test-agent', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', await app.getUrl())) as Transport);
  });
  afterAll(async () => { await client?.close(); await app?.close(); await bundle?.pool.end(); });
  it('shares human Contexts and agent Threads through REST and MCP with immutable snapshots', async () => {
    const http = app.getHttpServer();
    const context = (await request(http).post('/api/v1/contexts')
      .send({ title: 'Shared project', content: '# Background', createdByType: 'human' }).expect(201)).body;
    const tools = await client.listTools();
    expect(tools.tools.map(t => t.name).sort()).toEqual(['create_context', 'create_thread', 'get_context', 'get_thread', 'list_contexts']);
    const created = await client.callTool({ name: 'create_thread', arguments: {
      contextId: context.id, title: 'Deployment', content: 'Agent details', createdByType: 'agent', createdBy: 'test-agent',
    } });
    expect(created.isError).not.toBe(true);
    const thread = JSON.parse((created.content as { text: string }[])[0]!.text);
    const read = (await request(http).get(`/api/v1/contexts/${context.id}`).expect(200)).body;
    expect(read.threads).toHaveLength(1);
    expect(read.threads[0].content).toBeUndefined();
    expect(read.content).toBe('# Background');
    const body = (await request(http).get(`/api/v1/contexts/${context.id}/threads/${thread.id}`).expect(200)).body;
    expect(body.content).toBe('Agent details');
    expect(body.version).toBe(1);
    const snapshots = await bundle.db.select().from(revisions).where(eq(revisions.threadId, thread.id));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ title: 'Deployment', content: 'Agent details', source: 'mcp', version: 1 });
    await expect(bundle.db.update(revisions).set({ content: 'overwrite' }).where(eq(revisions.threadId, thread.id))).rejects.toThrow();
    const agentContext = await client.callTool({ name: 'create_context', arguments: { title: 'Agent Context', createdByType: 'agent' } });
    expect(agentContext.isError).not.toBe(true);
    const agentId = JSON.parse((agentContext.content as { text: string }[])[0]!.text).id;
    await request(http).post(`/api/v1/contexts/${agentId}/threads`).send({ title: 'Human Thread', createdByType: 'human' }).expect(201);
    await request(http).get(`/api/v1/contexts/${agentId}/threads/${thread.id}`).expect(404);
    expect((await client.callTool({ name: 'get_context', arguments: { contextId: context.id } })).isError).not.toBe(true);
    expect((await client.callTool({ name: 'get_thread', arguments: { contextId: context.id, threadId: thread.id } })).isError).not.toBe(true);
    expect((await client.callTool({ name: 'list_contexts', arguments: {} })).isError).not.toBe(true);
  });
  it('validates inputs and refuses orphan Threads', async () => {
    await request(app.getHttpServer()).post('/api/v1/contexts').send({ title: ' ', createdByType: 'human' }).expect(400);
    await request(app.getHttpServer()).get('/api/v1/contexts/not-a-uuid').expect(400);
    await request(app.getHttpServer()).post(`/api/v1/contexts/${randomUUID()}/threads`)
      .send({ title: 'Orphan', createdByType: 'agent' }).expect(404);
    const missing = await client.callTool({ name: 'create_thread', arguments: { contextId: randomUUID(), title: 'Orphan', createdByType: 'agent' } });
    expect(missing.isError).toBe(true);
  });
  it('rolls back a Context if its snapshot cannot be saved', async () => {
    await bundle.db.execute(sql`CREATE FUNCTION reject_test_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = '__fail_snapshot__' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END; $$`);
    await bundle.db.execute(sql`CREATE TRIGGER test_revision_failure BEFORE INSERT ON revisions FOR EACH ROW EXECUTE FUNCTION reject_test_revision()`);
    try {
      await request(app.getHttpServer()).post('/api/v1/contexts').send({ title: '__fail_snapshot__', createdByType: 'human' }).expect(500);
      const result = await bundle.db.execute(sql`SELECT id FROM contexts WHERE title = '__fail_snapshot__'`);
      expect(result.rows).toHaveLength(0);
    } finally {
      await bundle.db.execute(sql`DROP TRIGGER test_revision_failure ON revisions`);
      await bundle.db.execute(sql`DROP FUNCTION reject_test_revision()`);
    }
  });
});
