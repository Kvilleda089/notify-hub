import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { NotificationHandlers } from './application/commands/handler';
import { NotificationsController } from './application/controllers/notification.controller';
import { BullModule } from '@nestjs/bullmq';
import { NotificationQueueService } from './application/queues/notification-queue.service';
import { NotificationProcessor } from './application/processors/notification.processor';
import { ResendEmailService } from './infrastructure/email/resend-email.service';

@Module({

    imports:[
        PrismaModule, 
        ApiKeysModule,
        BullModule.registerQueue({
            name: 'notifications',
            defaultJobOptions: {
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400 }
            }
        })
    ],
    providers: [
        ...NotificationHandlers,
        NotificationQueueService,
        NotificationProcessor,
        ResendEmailService
    ],
    controllers: [NotificationsController]
})
export class NotificationsModule {}
