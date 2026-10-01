import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { TemporaryContextAccessSchema, TemporaryContextAppendSchema } from '@contextport/contracts';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { TemporaryContextService } from './temporary-context.service.js';

@Controller(['api/v1/temporary-contexts', 'api/v1/clipboard'])
export class TemporaryContextController {
  constructor(@Inject(TemporaryContextService) private readonly service: TemporaryContextService) {}

  @Post('open')
  @HttpCode(200)
  open(@Body(new ZodValidationPipe(TemporaryContextAccessSchema)) body: { passphrase: string }) {
    return this.service.open(body.passphrase);
  }

  @Post('generate')
  generate() { return this.service.generate(); }

  @Post('read')
  @HttpCode(200)
  read(@Body(new ZodValidationPipe(TemporaryContextAccessSchema)) body: { passphrase: string }) {
    return this.service.read(body.passphrase);
  }

  @Post('append')
  @HttpCode(200)
  append(@Body(new ZodValidationPipe(TemporaryContextAppendSchema)) body: { passphrase: string; content: string }) {
    return this.service.append(body.passphrase, body.content);
  }
}

// Backwards-compatible alias
export { TemporaryContextController as ClipboardController };
