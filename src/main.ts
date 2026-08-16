import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('NotifyHub')
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  await app.listen(env.port);
  logger.log(`Notify Hub running on port ${env.port}`)

}
bootstrap();
