import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CreateContextSchema, ListContextsSchema, type CreateContextInput } from '@contextport/contracts';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { ContextService } from './context.service.js';

@Controller('api/v1/contexts')
export class ContextController {
  constructor(@Inject(ContextService) private readonly service: ContextService) {}
  @Get()
  list(@Query(new ZodValidationPipe(ListContextsSchema)) query: { limit: number; offset: number }) {
    return this.service.list(query);
  }
  @Post()
  create(@Body(new ZodValidationPipe(CreateContextSchema)) body: CreateContextInput) {
    return this.service.create(body, 'rest');
  }
  @Get(':contextId')
  get(@Param('contextId', new ParseUUIDPipe()) id: string) { return this.service.get(id); }
  @Post(':contextId/threads')
  createThread(@Param('contextId', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(CreateContextSchema)) body: CreateContextInput) {
    return this.service.createThread(id, body, 'rest');
  }
  @Get(':contextId/threads/:threadId')
  getThread(@Param('contextId', new ParseUUIDPipe()) id: string,
    @Param('threadId', new ParseUUIDPipe()) threadId: string) {
    return this.service.getThread(id, threadId);
  }
}
