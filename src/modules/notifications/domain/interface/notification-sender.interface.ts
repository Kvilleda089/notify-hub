import { Notification, NotificationChannel } from "src/generated/prisma/client";

export interface SendOptions {
  idempotencyKey?: string;
}

export interface NotificationSender {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  send(notification: Notification, options?: SendOptions): Promise<string>;
}