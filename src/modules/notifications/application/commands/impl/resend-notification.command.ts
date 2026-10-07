import { ICommand } from "@nestjs/cqrs";

export class ResendNotificationCommand implements ICommand {
    constructor(
        public readonly projectId: string,
        public readonly notificationId: string,
    ){}
}