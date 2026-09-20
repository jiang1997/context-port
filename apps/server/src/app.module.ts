import { Module } from '@nestjs/common';
import { ContextModule } from './context/context.module.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { StageModule } from './stage/stage.module.js';
import { TagModule } from './tag/tag.module.js';
import { TaskModule } from './task/task.module.js';

@Module({
  imports: [DbModule, HealthModule, TaskModule, ContextModule, TagModule, StageModule, McpModule],
})
export class AppModule {}
