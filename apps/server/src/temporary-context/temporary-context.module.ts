import { Module } from '@nestjs/common';
import { TemporaryContextController } from './temporary-context.controller.js';
import { TemporaryContextService } from './temporary-context.service.js';

@Module({
  controllers: [TemporaryContextController],
  providers: [TemporaryContextService],
  exports: [TemporaryContextService],
})
export class TemporaryContextModule {}

// Backwards-compatible alias
export { TemporaryContextModule as ClipboardModule };
