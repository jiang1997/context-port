import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const objectPayload = typeof payload === 'object' && payload !== null ? payload : {};

    response.status(status).json({
      error: {
        code:
          'code' in objectPayload && typeof objectPayload.code === 'string'
            ? objectPayload.code
            : status === 500
              ? 'INTERNAL_ERROR'
              : 'HTTP_ERROR',
        message:
          'message' in objectPayload && typeof objectPayload.message === 'string'
            ? objectPayload.message
            : status === 500
              ? 'An unexpected error occurred.'
              : String(payload),
        ...('details' in objectPayload ? { details: objectPayload.details } : {}),
        requestId: request.requestId ?? 'unknown',
      },
    });
  }
}
