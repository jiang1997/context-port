import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { createDatabase, type Database } from '@contextport/db';
import type { Pool } from 'pg';
import { getEnvironment } from '../config/environment.js';
import { requestDatabase } from './request-database.js';

export const DATABASE = Symbol('DATABASE');
export const DATABASE_POOL = Symbol('DATABASE_POOL');

const workers = getEnvironment().SERVER_RUNTIME === 'workers';
const databaseBundle = workers ? undefined : createDatabase(getEnvironment().DATABASE_URL);

@Injectable()
class DatabaseLifecycle implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    { provide: DATABASE, useValue: (databaseBundle?.db ?? requestDatabase) satisfies Database },
    { provide: DATABASE_POOL, useValue: databaseBundle?.pool ?? null },
    ...(workers ? [] : [DatabaseLifecycle]),
  ],
  exports: [DATABASE, DATABASE_POOL],
})
export class DbModule {}
