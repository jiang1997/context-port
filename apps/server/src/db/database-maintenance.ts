import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SessionService } from '../auth/session.service.js';
import { getEnvironment } from '../config/environment.js';
import { TemporaryContextService } from '../temporary-context/temporary-context.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DatabaseMaintenance implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseMaintenance.name);
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private task?: Promise<void>;

  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(TemporaryContextService) private readonly temporary: TemporaryContextService,
  ) {}

  async onModuleInit() {
    // Workers run cleanup from the scheduled handler with a request-scoped pool.
    if (getEnvironment().SERVER_RUNTIME === 'workers') return;
    await this.runCleanup();
    this.scheduleCleanup();
  }

  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.task;
  }

  async pruneExpired() {
    // Wait for both operations even if one fails before the Worker closes its pool.
    const results = await Promise.allSettled([this.sessions.pruneExpired(), this.temporary.deleteExpired()]);
    const failures = results.flatMap(result => result.status === 'rejected' ? [result.reason] : []);
    if (failures.length) throw new AggregateError(failures, 'Database cleanup failed');
  }

  private async runCleanup() {
    try {
      await this.pruneExpired();
    } catch (error) {
      this.logger.error(error);
    }
  }

  private scheduleCleanup() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.task = this.runCleanup().finally(() => this.scheduleCleanup());
    }, DAY_MS);
    this.timer.unref();
  }
}
