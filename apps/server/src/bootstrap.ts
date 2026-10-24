import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { getEnvironment } from './config/environment.js';
import { createCorsOptions } from './config/cors.js';

export async function createApplication() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '1mb' });
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors(createCorsOptions(getEnvironment()));
  return app;
}
