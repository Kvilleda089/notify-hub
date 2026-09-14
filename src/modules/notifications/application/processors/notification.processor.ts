import { Processor, WorkerHost } from "@nestjs/bullmq";
import { NOTIFICATIONS_QUEUE, PROCESS_NOTIFICATION_JOB } from "../queues/notification-queue.service";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/database/prisma.service";
import { DeliveryAttemptStatus, NotificationStatus } from 'src/generated/prisma/client';
import { ResendEmailService } from "../../infrastructure/email/resend-email.service";



type ProcessNotificationJob = {
    notificationId: string;
};

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
    private readonly logger = new Logger(`${NotificationProcessor.name}`);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly resendEmailService: ResendEmailService,
    ) {
        super();
    }

    async process(job: Job<ProcessNotificationJob>) {


        if (job.name !== PROCESS_NOTIFICATION_JOB) {
            throw new Error(`Unsupported job: ${job.name}`)
        };

        const notification = await this.prismaService.notification.findUnique({
            where: {
                id: job.data.notificationId,
            },
        });

        if (!notification) {
            return
        };

        if (
            notification.status === NotificationStatus.SENT ||
            notification.status === NotificationStatus.FAILED ||
            notification.status === NotificationStatus.CANCELLED
        ) {
            return;
        };

        const attemptNumber = job.attemptsMade + 1;

        await this.prismaService.notification.update({
            where: {
                id: notification.id,
            },
            data: {
                status: NotificationStatus.PROCESSING,
            },
        });


        const deliveryAttempt = await this.prismaService.deliveryAttempt.create({
            data: {
                notificationId: notification.id,
                attemptNumber,
                provider: 'RESEND',
                status: DeliveryAttemptStatus.SUCCESS
            },
        });

        const providerMessageId = await this.resendEmailService.send({
            id: notification.id,
            recipient: notification.recipient,
            subject: notification.subject,
            templateCode: notification.templateCode,
            payload: notification.payload,
        });

        await this.prismaService.$transaction([
            this.prismaService.deliveryAttempt.update({
                where: {
                    id: deliveryAttempt.id,
                },
                data: {
                    status: DeliveryAttemptStatus.PROCESSING,
                    providerMessageId,
                    completedAt: new Date(),
                },
            }),
            this.prismaService.notification.update({
                where: {
                    id: notification.id,
                },
                data: {
                    status: NotificationStatus.SENT,
                    sentAt: new Date(),
                },
            }),
        ]);

        this.logger.log(`Email sent: ${notification.id}`);
        return {
            notificationId: notification.id,
            providerMessageId,
        };

    }
}
