import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateNotificationCommand } from "../impl/create-notification.command";
import { ConflictException, Logger } from "@nestjs/common";
import { CreateNotificationDto } from "src/modules/notifications/domain/dto/create-notification.dto";
import { PrismaService } from "src/database/prisma.service";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { handlePrismaError } from "src/database/helpers/prisma-error.handler";
import { NotificationQueueService } from "../../queues/notification-queue.service";


@CommandHandler(CreateNotificationCommand)
export class CreateNotificationHandler implements ICommandHandler<CreateNotificationCommand> {

    private readonly logger = new Logger(`${CreateNotificationHandler.name}`);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly notificationQueueService: NotificationQueueService,
    ) { }

    async execute(command: CreateNotificationCommand): Promise<any> {

        try {
            const { projectId, idempotencyKey, dataNotification } = command;
            const result = await this.createNotification(projectId, idempotencyKey, dataNotification);

            return result;
        } catch (error) {
            this.logger.error(`Error to created notification error: ${error}`)
            handlePrismaError(
                error,
                `Error to created notification  `
            );
        }

    }

    private async createNotification(projectId: string, idempotencyKey: string, dataNotification: CreateNotificationDto) {

        const existing = await this.prismaService.notification.findUnique({
            where: {
                projectId_idempotencyKey: {
                    projectId: projectId,
                    idempotencyKey: idempotencyKey,
                },
            },
        });

        if (existing) {
            const isSameRequest =
                existing.recipient === dataNotification.recipient &&
                existing.templateCode === dataNotification.templateCode &&
                existing.subject === (dataNotification.subject ?? null) &&
                JSON.stringify(existing.payload) === JSON.stringify(dataNotification.payload);

            if (!isSameRequest) {
                throw new ConflictException(`Idempotency-Key is already being used with different data.`);
            }

            return existing;
        }

        const notification = await this.prismaService.notification.create({
            data: {
                projectId: projectId,
                idempotencyKey: idempotencyKey,
                recipient: dataNotification.recipient,
                templateCode: dataNotification.templateCode,
                payload: dataNotification.payload,
                subject: dataNotification.subject,
                channel: NotificationChannel.EMAIL,
                status: NotificationStatus.PENDING,
            },
        });


        const queuedNotification = await this.prismaService.notification.update({
            where: {
                id: notification.id,
            },
            data: {
                status: NotificationStatus.QUEUED,
                queuedAt: new Date(),
            },
        });

        try {
            await this.notificationQueueService.enqueue(notification.id);

            return queuedNotification;
        } catch (error) {
            await this.prismaService.notification.update({
                where: {
                    id: notification.id,
                },
                data: {
                    status: NotificationStatus.PENDING,
                    queuedAt: null,
                },
            });

            throw error;
        }
    }


}