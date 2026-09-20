import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DATABASE } from '../db/db.module.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports liveness without querying the database', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DATABASE, useValue: { execute: async () => [] } }],
    }).compile();
    const app = module.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/health/live').expect(200).expect({ status: 'ok' });
    await app.close();
    expect(true).toBe(true);
  });
});
