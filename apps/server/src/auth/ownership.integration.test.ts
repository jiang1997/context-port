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

  it('keeps each user scoped to their own contexts across REST', async () => {
    const alice = await createUser('iso-alice', 'alice@example.com');
    await createUser('iso-bob', 'bob@example.com');
    const aliceCookie = await createSession(alice.id, 'alice-session-token');
    const context = (await request(app.getHttpServer()).post('/api/v1/contexts')
      .set('Cookie', aliceCookie).set('x-csrf-token', `csrf-alice-session-token`)
      .send({ title: 'Alice private plan', content: 'secret', createdByType: 'human' }).expect(201)).body;

    const aliceList = await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Cookie', aliceCookie).expect(200);
    expect(aliceList.body).toHaveLength(1);
    expect(aliceList.body[0].title).toBe('Alice private plan');
    await request(app.getHttpServer()).get(`/api/v1/contexts/${context.id}`)
      .set('Cookie', aliceCookie).expect(200);
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
    // REST with the raw key must resolve to Alice's data.
    const bearerList = await request(app.getHttpServer()).get('/api/v1/contexts')
      .set('Authorization', `Bearer ${rawKey}`).expect(200);
    expect(bearerList.body).toHaveLength(1);
    const rows = await bundle.db.select().from(apiKeys);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash('sha256').update(rawKey).digest('hex'));

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
