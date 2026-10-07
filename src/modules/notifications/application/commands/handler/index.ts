import { CreateNotificationHandler } from "./create-notification.handler";
import { ResendNotificationCommandHandler } from "./resend-notification.handler";



export const NotificationHandlers = [
    CreateNotificationHandler,
    ResendNotificationCommandHandler,
]