import { Module } from '@nestjs/common';
import { ContextModule } from './context/context.module.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';
import { McpModule } from './mcp/mcp.module.js';

@Module({
  imports: [DbModule, HealthModule, ContextModule, McpModule],
})
export class AppModule {}
