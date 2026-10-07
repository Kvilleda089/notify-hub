import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { ResendNotificationCommand } from "../impl/resend-notification.command";
import { ConflictException, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";
import { NotificationStatus } from "src/generated/prisma/client";
import { NotificationQueueService } from "../../queues/notification-queue.service";
import { handlePrismaError } from "src/database/helpers/prisma-error.handler";


@CommandHandler(ResendNotificationCommand)
export class ResendNotificationCommandHandler implements ICommandHandler<ResendNotificationCommand> {

    private readonly logger = new Logger(`${ResendNotificationCommandHandler.name}`);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly notificationQueueService: NotificationQueueService,
    ) { }

    async execute(command: ResendNotificationCommand): Promise<any> {
        try {
            const { projectId, notificationId } = command;
            return this.resendEmail(projectId, notificationId);
        } catch (error) {
            this.logger.error(`Error to created notification error: ${error}`)
            handlePrismaError(
                error,
                `Error to created notification  `
            );
        }

    }

    private async resendEmail(projectId: string, notificationId: string) {
        const notification = await this.prismaService.notification.findFirst({
            where: { id: notificationId, projectId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found.');
        }

        if (
            notification.status !== NotificationStatus.SENT &&
            notification.status !== NotificationStatus.FAILED
        ) {
            throw new ConflictException(
                `Cannot resend a notification with status ${notification.status}.`,
            );
        }

        const updated = await this.prismaService.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.QUEUED, queuedAt: new Date() },
        });

        await this.notificationQueueService.enqueueResend(notification.id);

        this.logger.log(`Notification ${notification.id} queued for resend.`);

        return updated;
    }
}