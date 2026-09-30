import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateContextSchema, ListContextsSchema, UpdateContextSchema, UpdateThreadSchema, type CreateContextInput, type UpdateContextInput, type UpdateThreadInput } from '@contextport/contracts';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { RequestIdentity } from '../auth/request-identity.decorator.js';
import type { AuthIdentity } from '../auth/auth-identity.js';
import { ContextService } from './context.service.js';

@Controller('api/v1/contexts')
export class ContextController {
  constructor(@Inject(ContextService) private readonly service: ContextService) {}
  @Get()
  list(
    @RequestIdentity() identity: AuthIdentity,
    @Query(new ZodValidationPipe(ListContextsSchema)) query: { limit: number; offset: number },
  ) {
    return this.service.list(identity.userId, query);
  }
  @Post()
  create(
    @RequestIdentity() identity: AuthIdentity,
    @Body(new ZodValidationPipe(CreateContextSchema)) body: CreateContextInput,
  ) {
    return this.service.create(identity.userId, body, 'rest');
  }
  @Get(':contextId')
  get(@RequestIdentity() identity: AuthIdentity, @Param('contextId', new ParseUUIDPipe()) id: string) {
    return this.service.get(identity.userId, id);
  }
  @Patch(':contextId')
  update(
    @RequestIdentity() identity: AuthIdentity,
    @Param('contextId', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateContextSchema)) body: UpdateContextInput,
  ) {
    return this.service.update(identity.userId, id, body, 'rest');
  }
  @Post(':contextId/threads')
  createThread(
    @RequestIdentity() identity: AuthIdentity,
    @Param('contextId', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(CreateContextSchema)) body: CreateContextInput,
  ) {
    return this.service.createThread(identity.userId, id, body, 'rest');
  }
  @Get(':contextId/threads/:threadId')
  getThread(
    @RequestIdentity() identity: AuthIdentity,
    @Param('contextId', new ParseUUIDPipe()) id: string,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
  ) {
    return this.service.getThread(identity.userId, id, threadId);
  }
  @Patch(':contextId/threads/:threadId')
  updateThread(
    @RequestIdentity() identity: AuthIdentity,
    @Param('contextId', new ParseUUIDPipe()) id: string,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
    @Body(new ZodValidationPipe(UpdateThreadSchema)) body: UpdateThreadInput,
  ) {
    return this.service.updateThread(identity.userId, id, threadId, body, 'rest');
  }
}
