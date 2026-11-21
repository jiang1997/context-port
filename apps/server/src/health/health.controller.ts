import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Database } from '@contextport/db';
import { DATABASE } from '../db/db.module.js';
import { Public } from '../auth/auth-policy.decorator.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get('live')
  @Public()
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async ready() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is not ready.',
      });
    }
  }
}
