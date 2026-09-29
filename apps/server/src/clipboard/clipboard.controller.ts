import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ClipboardAccessSchema, ClipboardAppendSchema } from '@contextport/contracts';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { ClipboardService } from './clipboard.service.js';

@Controller('api/v1/clipboard')
export class ClipboardController {
  constructor(@Inject(ClipboardService) private readonly service: ClipboardService) {}

  @Post('open')
  @HttpCode(200)
  open(@Body(new ZodValidationPipe(ClipboardAccessSchema)) body: { passphrase: string }) {
    return this.service.open(body.passphrase);
  }

  @Post('generate')
  generate() { return this.service.generate(); }

  @Post('read')
  @HttpCode(200)
  read(@Body(new ZodValidationPipe(ClipboardAccessSchema)) body: { passphrase: string }) {
    return this.service.read(body.passphrase);
  }

  @Post('append')
  @HttpCode(200)
  append(@Body(new ZodValidationPipe(ClipboardAppendSchema)) body: { passphrase: string; content: string }) {
    return this.service.append(body.passphrase, body.content);
  }
}
