import { Module } from '@nestjs/common';
import { ContextModule } from '../context/context.module.js';
import { TagModule } from '../tag/tag.module.js';
import { TaskModule } from '../task/task.module.js';
import { createMcpServer, MCP_SERVER } from './mcp.server.js';

@Module({
  imports: [TaskModule, ContextModule, TagModule],
  providers: [{ provide: MCP_SERVER, useFactory: createMcpServer }],
  exports: [MCP_SERVER],
})
export class McpModule {}
