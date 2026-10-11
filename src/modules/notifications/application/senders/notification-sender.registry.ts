import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "src/generated/prisma/client";
import type { NotificationSender } from "../../domain/interface/notification-sender.interface";
import { ResendEmailSender } from "../../infrastructure/email/resend-email.sender";
import { SmsSender } from "../../infrastructure/sms/sms.sender";

@Injectable()
export class NotificationSenderRegistry {
  private readonly senders: Map<NotificationChannel, NotificationSender>;

  constructor(
    private readonly resendEmailSender: ResendEmailSender,
    private readonly smsSender: SmsSender,
  ) {
    this.senders = new Map<NotificationChannel, NotificationSender>([
      [NotificationChannel.EMAIL, this.resendEmailSender],
      [NotificationChannel.SMS, this.smsSender],
    ]);
  }

  resolve(channel: NotificationChannel): NotificationSender {
    const sender = this.senders.get(channel);
    if (!sender) throw new Error(`No sender registered for channel ${channel}.`);
    return sender;
  }
}