import { Module, Type } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { NotificationHandlers } from './application/commands/handler';
import { NotificationsController } from './application/controllers/notification.controller';
import { BullModule } from '@nestjs/bullmq';
import { NotificationQueueService } from './application/queues/notification-queue.service';
import { NotificationProcessor } from './application/processors/notification.processor';
import { ResendEmailSender } from './infrastructure/email/resend-email.sender';
import { NotificationSenderRegistry } from './application/senders/notification-sender.registry';
import { env, SmsProviderName } from 'src/config';
import { SmsSender } from './infrastructure/sms/sms.sender';
import { MockSmsProvider } from './infrastructure/sms/providers/mock-sms.sender';
import { InfobipSmsProvider } from './infrastructure/sms/providers/infobip-sms.provider';
import  { SMS_PROVIDER_TOKEN, type SmsProvider } from './domain/interface/sms-provider.interface';


const smsProviders: Record<SmsProviderName, Type<SmsProvider>> = {
  mock: MockSmsProvider,
  infobip: InfobipSmsProvider,
};
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
        ResendEmailSender,
        SmsSender,
        NotificationSenderRegistry,
        { provide: SMS_PROVIDER_TOKEN, useClass: smsProviders[env.sms_provider] },
    ],
    controllers: [NotificationsController]
})
export class NotificationsModule {}
