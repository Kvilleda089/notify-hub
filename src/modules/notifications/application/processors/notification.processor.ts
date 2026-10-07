import { Processor, WorkerHost } from "@nestjs/bullmq";
import { NOTIFICATIONS_QUEUE, PROCESS_NOTIFICATION_JOB, RESEND_NOTIFICATION_JOB } from "../queues/notification-queue.service";
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
          const isResend = job.name === RESEND_NOTIFICATION_JOB;

        if (job.name !== PROCESS_NOTIFICATION_JOB && !isResend) {
            throw new Error(`Unsupported job: ${job.name}`);
        }

        const notification = await this.prismaService.notification.findUnique({
            where: {
                id: job.data.notificationId,
            },
        });

        if (!notification)  return;

        if (
            !isResend &&
            (notification.status === NotificationStatus.SENT ||
                notification.status === NotificationStatus.FAILED ||
                notification.status === NotificationStatus.CANCELLED)
        ) {
            return;
        }

        const previousAttempts = await this.prismaService.deliveryAttempt.count({
            where: { notificationId: notification.id },
        });
 

        const attemptNumber = previousAttempts + 1;
        let deliveryAttemptId: string | null = null;

        try {
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
                    status: DeliveryAttemptStatus.PROCESSING,
                },
            });

            deliveryAttemptId = deliveryAttempt.id;

            const providerMessageId = await this.resendEmailService.send({
                id: notification.id,
                recipient: notification.recipient,
                subject: notification.subject,
                htmlContent: notification.htmlContent,
                textContent: notification.textContent,
            });

            await this.prismaService.$transaction([
                this.prismaService.deliveryAttempt.update({
                    where: {
                        id: deliveryAttempt.id,
                    },
                    data: {
                        status: DeliveryAttemptStatus.SUCCESS,
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
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown email sending error.';

            const maxAttempts = job.opts.attempts ?? 1;
            const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;

            if (deliveryAttemptId) {
                await this.prismaService.deliveryAttempt.update({
                    where: {
                        id: deliveryAttemptId,
                    },
                    data: {
                        status: DeliveryAttemptStatus.FAILED,
                        errorCode: 'EMAIL_SEND_FAILED',
                        errorMessage,
                        completedAt: new Date(),
                    },
                });
            }

            await this.prismaService.notification.update({
                where: {
                    id: notification.id,
                },
                data: {
                    status: isLastAttempt
                        ? NotificationStatus.FAILED
                        : NotificationStatus.QUEUED,
                    failedAt: isLastAttempt ? new Date() : null,
                },
            });

            this.logger.error(
                `Email failed for notification ${notification.id}: ${errorMessage}`,
            );

            throw error;
        }
    }
}
