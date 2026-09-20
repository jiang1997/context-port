import { Module } from '@nestjs/common';
import { ContextModule } from '../context/context.module.js';
import { McpController } from './mcp.controller.js';

@Module({
  imports: [ContextModule],
  controllers: [McpController],
})
export class McpModule {}
