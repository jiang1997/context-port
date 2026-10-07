import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiKeyService } from '../auth/api-keys.service.js';
import { SessionService } from '../auth/session.service.js';
import { BusinessGuard } from '../common/business.guard.js';
import { TemporaryContextController } from '../temporary-context/temporary-context.controller.js';
import { TemporaryContextService } from '../temporary-context/temporary-context.service.js';
import { createCorsOptions } from './cors.js';
import { getEnvironment } from './environment.js';

@Controller('api/v1/contexts')
class PrivateController {
  @Get()
  read() { return {}; }
}

describe('Temporary Context CORS', () => {
  let app: INestApplication;
  const origin = 'https://third-party.example';
  const paths = ['temporary-contexts', 'clipboard'].flatMap(prefix =>
    ['generate', 'open', 'read', 'append', 'update'].map(action => `/api/v1/${prefix}/${action}`));
  const environment = { ...getEnvironment(), WEB_ORIGIN: 'https://app.example', WEB_EXTRA_ORIGINS: 'https://preview.example' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TemporaryContextController, PrivateController],
      providers: [
        { provide: TemporaryContextService, useValue: Object.fromEntries(
          ['generate', 'open', 'read', 'append', 'update'].map(action => [action, vi.fn().mockResolvedValue({ content: 'Clipboard content' })]),
        ) },
        { provide: SessionService, useValue: { resolve: async () => null } },
        { provide: ApiKeyService, useValue: { resolve: async () => null } },
        { provide: APP_GUARD, useClass: BusinessGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.enableCors(createCorsOptions(environment));
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it.each(paths)('allows foreign-origin preflight and JSON POST to %s without cookies', async path => {
    const preflight = await request(app.getHttpServer()).options(path)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('*');
    expect(preflight.headers['access-control-allow-methods']).toContain('POST');
    expect(preflight.headers['access-control-allow-headers']).toContain('content-type');
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();

    const body = {
      passphrase: 'example-strong-passphrase',
      ...(path.endsWith('/append') || path.endsWith('/update') ? { content: 'New content' } : {}),
      ...(path.endsWith('/update') ? { expectedVersion: 1 } : {}),
    };
    const response = await request(app.getHttpServer()).post(path).set('Origin', origin)
      .send(path.endsWith('/generate') ? {} : body)
      .expect(path.endsWith('/generate') ? 201 : 200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.body).toEqual({ content: 'Clipboard content' });
  });

  it('keeps foreign origins blocked on private routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/contexts').set('Origin', origin).expect(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each([environment.WEB_ORIGIN, 'https://preview.example'])('keeps whitelist CORS for %s on other routes', async allowedOrigin => {
    const response = await request(app.getHttpServer()).options('/api/v1/contexts')
      .set('Origin', allowedOrigin).set('Access-Control-Request-Method', 'GET').expect(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it.each(['/api/v1/clipboard-other/read', '/api/v1/temporary-contexts-other/read'])('does not open similarly named routes: %s', async path => {
    const response = await request(app.getHttpServer()).options(path)
      .set('Origin', origin).set('Access-Control-Request-Method', 'POST').expect(204);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
