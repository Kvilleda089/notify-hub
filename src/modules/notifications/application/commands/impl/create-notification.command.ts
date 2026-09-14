import { ICommand } from "@nestjs/cqrs";
import { CreateNotificationDto } from "src/modules/notifications/domain/dto/create-notification.dto";



export class CreateNotificationCommand implements ICommand {

    constructor(
            public readonly projectId: string,
            public readonly idempotencyKey: string,
            public readonly dataNotification: CreateNotificationDto,

    ){}
}