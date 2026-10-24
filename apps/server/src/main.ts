import { Logger } from '@nestjs/common';
import { createApplication } from './bootstrap.js';
import { getEnvironment } from './config/environment.js';

async function bootstrap() {
  const environment = getEnvironment();
  const app = await createApplication();
  app.enableShutdownHooks();

  await app.listen(environment.PORT, environment.HOST);
  Logger.log(
    `Server listening on http://${environment.HOST}:${environment.PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
