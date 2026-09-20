import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(
  request: Request & { requestId?: string },
  response: Response,
  next: NextFunction,
) {
  const incoming = request.header('x-request-id');
  request.requestId = incoming && incoming.length <= 200 ? incoming : randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
}
