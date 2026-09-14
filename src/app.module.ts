import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ProjectsModule } from './modules/projects/projects.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { env } from './config';

@Module({
  imports: [
    PrismaModule,
    CqrsModule.forRoot(),
    ProjectsModule,
    ApiKeysModule,
    NotificationsModule,
    BullModule.forRoot({
      connection: {
        host: env.redis_host,
        port: env.redis_port
      }
    })

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
