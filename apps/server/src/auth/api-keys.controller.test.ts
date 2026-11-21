import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BusinessGuard } from '../common/business.guard.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeyService } from './api-keys.service.js';
import { SessionService } from './session.service.js';

describe('API key management authentication', () => {
  const keys = {
    resolve: vi.fn().mockResolvedValue('user-1'),
    issue: vi.fn().mockResolvedValue({ id: 'key-id', name: 'key', createdAt: 'now', key: 'cpk_raw' }),
    revoke: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue([]),
  };
  const session = 'cp_session=valid-token';
  const cookie = `${session}; cp_csrf=abc`;
  const path = '/api/v1/auth/keys';
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        { provide: APP_GUARD, useClass: BusinessGuard },
        { provide: ApiKeyService, useValue: keys },
        { provide: SessionService, useValue: { resolve: async (token?: string) => token === 'valid-token' ? { id: 'user-1' } : null } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('requires a browser session for reads and writes', async () => {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).get(path).set('Authorization', 'Bearer cpk_raw').expect(401);
    await request(app.getHttpServer()).post(path).set('Authorization', 'Bearer cpk_raw').send({ name: 'key' }).expect(401);
    expect(keys.resolve).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get(path).set('Cookie', session).expect(200, []);
  });

  it('rejects a foreign Origin even with a valid session and CSRF token', async () => {
    await request(app.getHttpServer()).post(path).set('Origin', 'https://untrusted.example')
      .set('Cookie', cookie).set('x-csrf-token', 'abc').send({ name: 'key' }).expect(403);
  });

  it.each([
    [session, undefined],
    [session, 'abc'],
    [cookie, undefined],
    [cookie, 'xyz'],
    [cookie, 'longer'],
    [`${session}; cp_csrf=`, ''],
  ])('rejects creation with invalid double-submit tokens (%s, %s)', async (cookies, csrfHeader) => {
    const req = request(app.getHttpServer()).post(path).set('Cookie', cookies);
    if (csrfHeader !== undefined) req.set('x-csrf-token', csrfHeader);
    await req.send({ name: 'key' }).expect(403);
  });

  it('requires matching tokens to create and revoke keys', async () => {
    const revokePath = `${path}/0d2c9a55-6a15-4f0e-9f3a-0d3e40b07a01/revoke`;
    await request(app.getHttpServer()).post(revokePath).set('Cookie', cookie).expect(403);
    await request(app.getHttpServer()).post(path).set('Cookie', cookie).set('x-csrf-token', 'abc')
      .send({ name: 'key' }).expect(201);
    await request(app.getHttpServer()).post(revokePath).set('Cookie', cookie).set('x-csrf-token', 'abc').expect(204);
    expect(keys.issue).toHaveBeenCalledWith('user-1', 'key');
    expect(keys.revoke).toHaveBeenCalledWith('user-1', '0d2c9a55-6a15-4f0e-9f3a-0d3e40b07a01');
  });
});
