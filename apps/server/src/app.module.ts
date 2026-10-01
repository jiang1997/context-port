import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { ContextModule } from './context/context.module.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { BusinessGuard } from './common/business.guard.js';
import { TemporaryContextModule } from './temporary-context/temporary-context.module.js';
@Module({
  imports: [DbModule, HealthModule, AuthModule, ContextModule, McpModule, TemporaryContextModule],
  providers: [{ provide: APP_GUARD, useClass: BusinessGuard }],
})
export class AppModule {}
