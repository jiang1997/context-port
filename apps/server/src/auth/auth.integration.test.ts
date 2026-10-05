import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { Global, Module, type INestApplication } from '@nestjs/common';
import { createDatabase, sessions, users } from '@contextport/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DATABASE } from '../db/db.module.js';
import { hashSessionToken } from './auth.constants.js';
import { AuthModule } from './auth.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';

// Only use a dedicated disposable database; migrations never run against DATABASE_URL here.
describe.skipIf(!process.env.TEST_DATABASE_URL)('Google login sessions (phase 1)', () => {
  let app: INestApplication;
  let bundle: ReturnType<typeof createDatabase>;
  beforeAll(async () => {
    bundle = createDatabase(process.env.TEST_DATABASE_URL!);
    await migrate(bundle.db, { migrationsFolder: fileURLToPath(new URL('../../../../packages/db/migrations', import.meta.url)) });
    @Global()
    @Module({ providers: [{ provide: DATABASE, useValue: bundle.db }], exports: [DATABASE] })
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({ imports: [TestDatabaseModule, AuthModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => { await app?.close(); await bundle?.pool.end(); });
  beforeEach(async () => {
    await bundle.db.execute(sql`TRUNCATE users, sessions CASCADE`);
  });

  async function createVerifiedUser(googleSub: string, email: string) {
    const [user] = await bundle.db.insert(users).values({ googleSub, email }).returning();
    return user!;
  }

  it('upserts the user idempotently per Google sub and updates display fields', async () => {
    const user = await createVerifiedUser('sub-1', 'first@example.com');
    const [updated] = await bundle.db.insert(users).values({
      googleSub: 'sub-1', email: 'renamed@example.com', name: 'Renamed',
    })
      .onConflictDoUpdate({ target: users.googleSub, set: { email: 'renamed@example.com', name: 'Renamed', lastLoginAt: sql`now()` } })
      .returning();
    expect(updated!.id).toBe(user.id);
    expect(updated!.email).toBe('renamed@example.com');
    const all = await bundle.db.select().from(users).where(eq(users.googleSub, 'sub-1'));
    expect(all).toHaveLength(1);
  });

  it('issues, resolves and revokes a session through the API endpoints', async () => {
    const user = await createVerifiedUser('sub-2', 'session@example.com');
    await bundle.db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashSessionToken('opaque-session-token'),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me')
      .set('Cookie', 'cp_session=opaque-session-token').expect(200);
    expect(me.body.user).toMatchObject({ id: user.id, email: 'session@example.com' });
    expect(me.body.csrfToken).toBeNull();

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(200).then(r => {
      expect(r.body.user).toBeNull();
    });
    await request(app.getHttpServer()).post('/api/v1/auth/logout')
      .set('Cookie', 'cp_session=opaque-session-token; cp_csrf=csrf-token')
      .set('x-csrf-token', 'csrf-token').expect(204);
    await request(app.getHttpServer()).get('/api/v1/auth/me')
      .set('Cookie', 'cp_session=opaque-session-token').expect(200)
      .then(r => expect(r.body.user).toBeNull());
  });

  it('rejects expired and unknown session cookies', async () => {
    const user = await createVerifiedUser('sub-3', 'expired@example.com');
    await bundle.db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashSessionToken('expired-token'),
      createdAt: new Date(Date.now() - 10_000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    await request(app.getHttpServer()).get('/api/v1/auth/me')
      .set('Cookie', 'cp_session=expired-token').expect(200)
      .then(r => expect(r.body.user).toBeNull());
    await request(app.getHttpServer()).get('/api/v1/auth/me')
      .set('Cookie', 'cp_session=never-issued').expect(200)
      .then(r => expect(r.body.user).toBeNull());
  });
});
