import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import type { Request } from 'express';
import { isTemporaryContextPath } from '../temporary-context/temporary-context.paths.js';
import { getAllowedOrigins, type Environment } from './environment.js';

export function createCorsOptions(environment: Environment): CorsOptionsDelegate<Request> {
  const allowedOrigins = getAllowedOrigins(environment);
  return (req, callback) => callback(null, {
    origin: isTemporaryContextPath(req.path) ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['authorization', 'content-type', 'x-csrf-token', 'x-request-id'],
  });
}
