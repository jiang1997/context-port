import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createDatabase, apiKeys, contexts, sessions, users } from '@contextport/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSessionToken } from './auth.constants.js';
import { AuthModule } from './auth.module.js';
import { ContextModule } from '../context/context.module.js';
import { McpModule } from '../mcp/mcp.module.js';
import { BusinessGuard } from '../common/business.guard.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { DATABASE } from '../db/db.module.js';

// Network-mode environment for the global guard; the disposable database is
// shared with the other integration files, which run sequentially.
const config = vi.hoisted(() => ({
  NODE_ENV: 'test',
  DATABASE_URL: 'unused',
  DEPLOYMENT_MODE: 'network',
  WEB_ORIGIN: 'http://localhost:5173',
  WEB_EXTRA_ORIGINS: '',
}));
vi.mock('../config/environment.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/environment.js')>();
  return { ...actual, getEnvironment: () => config };
});

describe.skipIf(!process.env.TEST_DATABASE_URL)('per-user data isolation (phase 2)', () => {
  let app: INestApplication;
  let bundle: ReturnType<typeof createDatabase>;
  let serverUrl: string;
  beforeAll(async () => {
    bundle = createDatabase(process.env.TEST_DATABASE_URL!);
    await migrate(bundle.db, { migrationsFolder: fileURLToPath(new URL('../../../../packages/db/migrations', import.meta.url)) });
    @Global()
    @Module({ providers: [{ provide: DATABASE, useValue: bundle.db }], exports: [DATABASE] })
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({
      imports: [TestDatabaseModule, AuthModule, ContextModule, McpModule],
      providers: [{ provide: APP_GUARD, useClass: BusinessGuard }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    serverUrl = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); await bundle?.pool.end(); });
  beforeEach(async () => {
    await bundle.db.execute(sql`TRUNCATE revisions, threads, contexts, api_keys, sessions, users`);
  });

  async function createUser(googleSub: string, email: string) {
    const [user] = await bundle.db.insert(users).values({ googleSub, email }).returning();
    return user!;
  }
  async function createSession(userId: string, token: string) {
    await bundle.db.insert(sessions).values({
      userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    return `cp_session=${token}; cp_csrf=csrf-${token}`;
  }

  it('keeps Contexts, Threads, and keys scoped to their owners across REST and MCP', async () => {
    const http = app.getHttpServer();
    const alice = await createUser('iso-alice', 'alice@example.com');
    const bob = await createUser('iso-bob', 'bob@example.com');
    const aliceCookie = await createSession(alice.id, 'alice-session-token');
    const bobCookie = await createSession(bob.id, 'bob-session-token');
    const create = { title: 'Private document', content: 'Alice only', createdByType: 'human' };
    const { id: contextId } = (await request(http).post('/api/v1/contexts')
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-alice-session-token').send(create).expect(201)).body;
    const contextPath = `/api/v1/contexts/${contextId}`;
    const { id: threadId } = (await request(http).post(`${contextPath}/threads`)
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-alice-session-token').send(create).expect(201)).body;
    const threadPath = `${contextPath}/threads/${threadId}`;
    const { id: aliceKeyId } = (await request(http).post('/api/v1/auth/keys')
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-alice-session-token').send({ name: 'Alice key' }).expect(201)).body;
    const { key: bobKey } = (await request(http).post('/api/v1/auth/keys')
      .set('Cookie', bobCookie).set('x-csrf-token', 'csrf-bob-session-token').send({ name: 'Bob key' }).expect(201)).body;

    const change = { content: 'Bob cannot change this', updatedByType: 'human', expectedVersion: 1 };
    await request(http).get('/api/v1/contexts').set('Cookie', bobCookie).expect(200, []);
    for (const path of [contextPath, threadPath]) {
      await request(http).get(path).set('Cookie', bobCookie).expect(404);
      await request(http).patch(path).set('Cookie', bobCookie).set('x-csrf-token', 'csrf-bob-session-token').send(change).expect(404);
    }
    await request(http).post(`${contextPath}/threads`).set('Cookie', bobCookie)
      .set('x-csrf-token', 'csrf-bob-session-token').send(create).expect(404);
    await request(http).post(`/api/v1/auth/keys/${aliceKeyId}/revoke`).set('Cookie', bobCookie)
      .set('x-csrf-token', 'csrf-bob-session-token').expect(403);

    const client = new Client({ name: 'bob-agent', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('/mcp', serverUrl), {
      requestInit: { headers: { authorization: `Bearer ${bobKey}` } },
    });
    await client.connect(transport as Transport);
    try {
      const listed = await client.callTool({ name: 'list_contexts', arguments: {} });
      expect(listed.isError).not.toBe(true);
      expect(listed.content).toEqual([{ type: 'text', text: '[]' }]);
      for (const [name, args, code] of [
        ['get_context', { contextId }, 'CONTEXT_NOT_FOUND'],
        ['update_context', { contextId, ...change }, 'CONTEXT_NOT_FOUND'],
        ['create_thread', { contextId, ...create }, 'CONTEXT_NOT_FOUND'],
        ['get_thread', { contextId, threadId }, 'THREAD_NOT_FOUND'],
        ['update_thread', { contextId, threadId, ...change }, 'THREAD_NOT_FOUND'],
      ] as const) {
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError).toBe(true);
        expect(JSON.stringify(result.content)).toContain(code);
      }
    } finally {
      await client.close();
    }

    const context = (await request(http).get(contextPath).set('Cookie', aliceCookie).expect(200)).body;
    expect(context).toMatchObject({ content: 'Alice only', version: 1, threads: [{ id: threadId, version: 1 }] });
    const thread = (await request(http).get(threadPath).set('Cookie', aliceCookie).expect(200)).body;
    expect(thread).toMatchObject({ content: 'Alice only', version: 1 });
    const [aliceKey] = await bundle.db.select().from(apiKeys).where(eq(apiKeys.id, aliceKeyId));
    expect(aliceKey?.revokedAt).toBeNull();
  });

  it('rejects anonymous, forged and CSRF-less requests with 401/403', async () => {
    const alice = await createUser('iso-anon', 'anon-owner@example.com');
    const aliceCookie = await createSession(alice.id, 'anon-session-token');
    const context = (await request(app.getHttpServer()).post('/api/v1/contexts')
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-anon-session-token')
      .send({ title: 'Alice only', createdByType: 'human' }).expect(201)).body;

    await request(app.getHttpServer()).get('/api/v1/contexts').expect(401);
    await request(app.getHttpServer()).get(`/api/v1/contexts/${context.id}`).expect(401);
    await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Cookie', 'cp_session=forged-token').expect(401);
    await request(app.getHttpServer()).post('/api/v1/contexts')
      .set('Cookie', aliceCookie) // session cookie without CSRF header
      .send({ title: 'CSRF blocked', createdByType: 'human' }).expect(403);
  });

  it('rejects the old shared token', async () => {
    await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Authorization', 'Bearer test-token-at-least-24-characters').expect(401);
  });

  it('resolves personal MCP keys to their owner and honors revocation', async () => {
    const alice = await createUser('iso-mcp-alice', 'mcp-alice@example.com');
    const aliceCookie = await createSession(alice.id, 'mcp-session-token');
    const context = (await request(app.getHttpServer()).post('/api/v1/contexts')
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-mcp-session-token')
      .send({ title: 'Alice MCP data', createdByType: 'human' }).expect(201)).body;

    const issued = await request(app.getHttpServer()).post('/api/v1/auth/keys')
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-mcp-session-token')
      .send({ name: 'CLI key' }).expect(201);
    const rawKey = issued.body.key as string;
    expect(rawKey.startsWith('cpk_')).toBe(true);
    const keyId = issued.body.id as string;
    const keyFilter = eq(apiKeys.id, keyId);
    const [unusedKey] = await bundle.db.select().from(apiKeys).where(keyFilter);
    expect(unusedKey?.lastUsedAt).toBeNull();

    // REST with the raw key must resolve to Alice's data.
    const bearerList = await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Authorization', `Bearer ${rawKey}`).expect(200);
    expect(bearerList.body).toHaveLength(1);
    const rows = await bundle.db.select().from(apiKeys);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash('sha256').update(rawKey).digest('hex'));
    expect(Date.parse(rows[0]!.lastUsedAt!)).toBeGreaterThan(0);

    const [recentKey] = await bundle.db.update(apiKeys).set({ lastUsedAt: sql`now() - interval '1 minute'` })
      .where(keyFilter).returning({ lastUsedAt: apiKeys.lastUsedAt });
    await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Authorization', `Bearer ${rawKey}`).expect(200);
    const [throttledKey] = await bundle.db.select().from(apiKeys).where(keyFilter);
    expect(throttledKey!.lastUsedAt).toBe(recentKey!.lastUsedAt);

    const [staleKey] = await bundle.db.update(apiKeys).set({ lastUsedAt: sql`now() - interval '6 minutes'` })
      .where(keyFilter).returning({ lastUsedAt: apiKeys.lastUsedAt });

    const client = new Client({ name: 'iso-mcp', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('/mcp', serverUrl), {
      requestInit: { headers: { authorization: `Bearer ${rawKey}` } },
    } as never);
    await client.connect(transport as Transport);

    const list = await client.callTool({ name: 'list_contexts', arguments: {} });
    expect(list.isError).not.toBe(true);
    const parsed = JSON.parse((list.content as { text: string }[])[0]!.text) as { id: string }[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.id).toBe(context.id);

    const [keyRow] = await bundle.db.select().from(apiKeys).where(eq(apiKeys.tokenHash, hashSessionToken(rawKey)));
    expect(Date.parse(keyRow!.lastUsedAt!)).toBeGreaterThan(Date.parse(staleKey!.lastUsedAt!));
    await request(app.getHttpServer()).post(`/api/v1/auth/keys/${keyRow!.id}/revoke`)
      .set('Cookie', aliceCookie).set('x-csrf-token', 'csrf-mcp-session-token').expect(204);
    // Revocation kills the credential at the HTTP layer, which the SDK
    // surfaces as a transport error rather than a tool-level isError.
    await expect(client.callTool({ name: 'list_contexts', arguments: {} })).rejects.toThrow();
    await client.close();
  });

  it('requires ownership at the database layer', async () => {
    await expect(bundle.db.execute(sql`INSERT INTO contexts (title, created_by_type, updated_by_type) VALUES ('Orphan', 'human', 'human')`))
      .rejects.toThrow();
  });
});
