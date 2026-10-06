import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createDatabase, clipboards } from '@contextport/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE } from '../db/db.module.js';
import { getEnvironment } from '../config/environment.js';
import { TemporaryContextService } from './temporary-context.service.js';
import { TemporaryContextModule } from './temporary-context.module.js';
import { BusinessGuard } from '../common/business.guard.js';
import { SessionService } from '../auth/session.service.js';
import { ApiKeyService } from '../auth/api-keys.service.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Anonymous clipboard integration', () => {
  let app: INestApplication;
  let bundle: ReturnType<typeof createDatabase>;
  beforeAll(async () => {
    bundle = createDatabase(process.env.TEST_DATABASE_URL!);
    await migrate(bundle.db, { migrationsFolder: fileURLToPath(new URL('../../../../packages/db/migrations', import.meta.url)) });
    await bundle.db.delete(clipboards);
    @Global()
    @Module({ providers: [{ provide: DATABASE, useValue: bundle.db }], exports: [DATABASE] })
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({
      imports: [TestDatabaseModule, TemporaryContextModule],
      providers: [
        { provide: SessionService, useValue: { resolve: async () => null } },
        { provide: ApiKeyService, useValue: { resolve: async () => null } },
        { provide: APP_GUARD, useClass: BusinessGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => { await app?.close(); await bundle?.pool.end(); });

  it('creates, reopens and appends atomically without login', async () => {
    const http = app.getHttpServer();
    const passphrase = 'example-strong-passphrase';
    const first = (await request(http).post('/api/v1/clipboard/open').send({ passphrase }).expect(200)).body;
    expect(first).toMatchObject({ created: true, content: '', version: 1 });
    const second = (await request(http).post('/api/v1/clipboard/open').send({ passphrase }).expect(200)).body;
    expect(second.created).toBe(false);
    await Promise.all(['Agent A', 'Agent B'].map(content =>
      request(http).post('/api/v1/clipboard/append').send({ passphrase, content }).expect(200)));
    const read = (await request(http).post('/api/v1/clipboard/read').send({ passphrase }).expect(200)).body;
    expect(read.version).toBe(3);
    expect(read.content).toContain('Agent A');
    expect(read.content).toContain('Agent B');
    expect(read.content).toContain('\n\n');
    await request(http).post('/api/v1/clipboard/open').send({ passphrase: 'short' }).expect(400);
  });

  it('generates a usable passphrase and blocks expired content', async () => {
    const http = app.getHttpServer();
    const created = (await request(http).post('/api/v1/clipboard/generate').expect(201)).body;
    expect(created.passphrase).toMatch(/^[A-Za-z0-9_-]{32}$/);
    await request(http).post('/api/v1/clipboard/append').send({ passphrase: created.passphrase, content: 'Secret' }).expect(200);
    await bundle.db.update(clipboards).set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(clipboards.passphraseHash, (await bundle.db.select({ hash: clipboards.passphraseHash }).from(clipboards)
        .where(sql`${clipboards.content} = 'Secret'`))[0]!.hash));
    await request(http).post('/api/v1/clipboard/read').send({ passphrase: created.passphrase }).expect(404);
    await request(http).post('/api/v1/clipboard/append').send({ passphrase: created.passphrase, content: 'More' }).expect(404);
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase: created.passphrase, content: 'Replacement', expectedVersion: 2 }).expect(404);
    const renewed = (await request(http).post('/api/v1/clipboard/open').send({ passphrase: created.passphrase }).expect(200)).body;
    expect(renewed).toMatchObject({ created: true, content: '' });
  });

  it('replaces and clears existing content and renews its expiry', async () => {
    const http = app.getHttpServer();
    const passphrase = 'editable-temporary-context';
    await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase }).expect(200);
    const original = (await request(http).post('/api/v1/temporary-contexts/append').send({ passphrase, content: 'Original content' }).expect(200)).body;
    const edited = (await request(http).post('/api/v1/temporary-contexts/update').send({
      passphrase, content: '  Edited Markdown\n', expectedVersion: original.version,
    }).expect(200)).body;
    expect(edited).toMatchObject({ content: '  Edited Markdown\n', version: original.version + 1, createdAt: original.createdAt });
    expect(Date.parse(edited.expiresAt)).toBeGreaterThanOrEqual(Date.parse(original.expiresAt));
    const cleared = (await request(http).post('/api/v1/clipboard/update').send({ passphrase, content: '', expectedVersion: edited.version }).expect(200)).body;
    expect(cleared).toMatchObject({ content: '', version: edited.version + 1 });
    const read = (await request(http).post('/api/v1/temporary-contexts/read').send({ passphrase }).expect(200)).body;
    expect(read.content).toBe('');
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase, content: 'Missing version' }).expect(400);
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase, content: 'x'.repeat(100_001), expectedVersion: cleared.version }).expect(400);
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase: 'missing-temporary-context', content: 'Missing', expectedVersion: 1 }).expect(404);
  });


  const hash = (passphrase: string) => createHmac('sha256', getEnvironment().CLIPBOARD_SECRET ?? 'contextport-local-development-only-secret')
    .update(passphrase).digest('hex');

  it.each(['open', 'read', 'append', 'update'] as const)('renews expiry on %s without losing existing content', async action => {
    const http = app.getHttpServer();
    const passphrase = `renewal-test-${action}`;
    const original = (await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase }).expect(200)).body;
    await bundle.db.update(clipboards).set({ content: 'Existing', expiresAt: new Date(Date.now() + 60_000).toISOString() })
      .where(eq(clipboards.passphraseHash, hash(passphrase)));
    const before = Date.now();
    const response = (await request(http).post(`/api/v1/temporary-contexts/${action}`).send({
      passphrase, ...(action === 'append' ? { content: 'Addition' } : {}),
      ...(action === 'update' ? { content: 'Replacement', expectedVersion: 1 } : {}),
    }).expect(200)).body;
    const week = 7 * 24 * 60 * 60 * 1000;
    expect(Date.parse(response.expiresAt)).toBeGreaterThanOrEqual(before + week - 1000);
    expect(Date.parse(response.expiresAt)).toBeLessThanOrEqual(Date.now() + week);
    expect(response.createdAt).toBe(original.createdAt);
    if (action === 'open' || action === 'read') {
      expect(response).toMatchObject({ content: 'Existing', version: 1, updatedAt: original.updatedAt });
    } else {
      expect(response.version).toBe(2);
      expect(response.content).toBe(action === 'append' ? 'Existing\n\nAddition' : 'Replacement');
    }
    const [stored] = await bundle.db.select().from(clipboards).where(eq(clipboards.passphraseHash, hash(passphrase)));
    expect(stored!.expiresAt).toBe(response.expiresAt);
  });

  it('does not renew expiry on rejected writes', async () => {
    const http = app.getHttpServer();
    const passphrase = 'failed-write-expiry-test';
    await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase }).expect(200);
    const deadline = new Date(Date.now() + 60_000).toISOString();
    await bundle.db.update(clipboards).set({ content: 'x'.repeat(100_000), expiresAt: deadline })
      .where(eq(clipboards.passphraseHash, hash(passphrase)));
    await request(http).post('/api/v1/temporary-contexts/append').send({ passphrase, content: 'Too much' }).expect(413);
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase, content: 'Stale', expectedVersion: 999 }).expect(409);
    const [stored] = await bundle.db.select().from(clipboards).where(eq(clipboards.passphraseHash, hash(passphrase)));
    expect(Date.parse(stored!.expiresAt)).toBe(Date.parse(deadline));
    expect(stored!.version).toBe(1);
  });

  it('deletes expired records while preserving recently accessed records', async () => {
    const http = app.getHttpServer();
    const expired = 'cleanup-expired-context';
    const active = 'cleanup-active-context';
    await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase: expired }).expect(200);
    await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase: active }).expect(200);
    await bundle.db.update(clipboards).set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(clipboards.passphraseHash, hash(expired)));
    await request(http).post('/api/v1/temporary-contexts/read').send({ passphrase: expired }).expect(404);
    await app.get(TemporaryContextService).deleteExpired();
    expect(await bundle.db.select().from(clipboards).where(eq(clipboards.passphraseHash, hash(expired)))).toHaveLength(0);
    expect(await bundle.db.select().from(clipboards).where(eq(clipboards.passphraseHash, hash(active)))).toHaveLength(1);
  });

  it('rejects stale edits after append and allows only one concurrent replacement', async () => {
    const http = app.getHttpServer();
    const passphrase = 'concurrent-temporary-context';
    const original = (await request(http).post('/api/v1/temporary-contexts/open').send({ passphrase }).expect(200)).body;
    const appended = (await request(http).post('/api/v1/temporary-contexts/append').send({ passphrase, content: 'Agent addition' }).expect(200)).body;
    await request(http).post('/api/v1/temporary-contexts/update').send({ passphrase, content: 'Stale draft', expectedVersion: original.version }).expect(409);
    const afterConflict = (await request(http).post('/api/v1/temporary-contexts/read').send({ passphrase }).expect(200)).body;
    expect(afterConflict).toMatchObject({ content: 'Agent addition', version: appended.version });
    const responses = await Promise.all(['Edit A', 'Edit B'].map(content =>
      request(http).post('/api/v1/temporary-contexts/update').send({ passphrase, content, expectedVersion: appended.version })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const winner = responses.find(response => response.status === 200)!.body;
    const final = (await request(http).post('/api/v1/temporary-contexts/read').send({ passphrase }).expect(200)).body;
    expect(final).toMatchObject({ content: winner.content, version: appended.version + 1 });
  });
});
