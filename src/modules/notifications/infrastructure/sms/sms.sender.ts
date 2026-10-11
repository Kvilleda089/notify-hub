import { Inject, Injectable } from "@nestjs/common";
import { Notification, NotificationChannel } from "src/generated/prisma/client";
import type { NotificationSender } from "../../domain/interface/notification-sender.interface";
import { SMS_PROVIDER_TOKEN } from "../../domain/interface/sms-provider.interface";
import type { SmsProvider } from "../../domain/interface/sms-provider.interface";

@Injectable()
export class SmsSender implements NotificationSender {
  readonly channel = NotificationChannel.SMS;

  constructor(
    @Inject(SMS_PROVIDER_TOKEN) private readonly provider: SmsProvider,
  ) {}

  // El processor lo guarda en DeliveryAttempt.provider
  get providerName(): string {
    return this.provider.name;
  }

  async send(notification: Notification): Promise<string> {
    if (!notification.textContent) {
      throw new Error("textContent is required to send an SMS.");
    }

    return this.provider.send({
      to: notification.recipient,
      text: notification.textContent,
      reference: notification.id,
    });
  }
}