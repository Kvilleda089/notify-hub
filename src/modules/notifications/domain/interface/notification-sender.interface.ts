import { Notification, NotificationChannel } from "src/generated/prisma/client";

export interface NotificationSender {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  send(notification: Notification): Promise<string>; 
}