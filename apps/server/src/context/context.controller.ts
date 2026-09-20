import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateSharedContextSchema,
  type CreateSharedContextInput,
  UpdateSharedContextSchema,
  type UpdateSharedContextInput,
} from '@contextport/contracts';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { ContextService } from './context.service.js';

@Controller('api/v1/contexts')
export class ContextController {
  constructor(@Inject(ContextService) private readonly contexts: ContextService) {}

  @Get()
  list() {
    return this.contexts.list();
  }

  @Get(':contextId')
  get(@Param('contextId', new ParseUUIDPipe()) contextId: string) {
    return this.contexts.get(contextId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateSharedContextSchema)) input: CreateSharedContextInput,
  ) {
    return this.contexts.create(input);
  }

  @Patch(':contextId')
  update(
    @Param('contextId', new ParseUUIDPipe()) contextId: string,
    @Body(new ZodValidationPipe(UpdateSharedContextSchema)) input: UpdateSharedContextInput,
  ) {
    return this.contexts.update(contextId, input);
  }

  @Delete(':contextId')
  @HttpCode(204)
  remove(@Param('contextId', new ParseUUIDPipe()) contextId: string) {
    return this.contexts.remove(contextId);
  }
}
