import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from 'src/config';
import { Notification, NotificationChannel } from 'src/generated/prisma/client';
import { NotificationSender } from '../../domain/interface/notification-sender.interface';

@Injectable()
export class ResendEmailSender implements NotificationSender {
  readonly channel = NotificationChannel.EMAIL;
  readonly providerName = 'RESEND';
  private readonly resend = new Resend(env.resend_api_key);

  async send(notification: Notification): Promise<string> {
    if (!notification.subject || !notification.htmlContent) {
      throw new Error('subject and htmlContent are required to send an email.');
    }

    const { data, error } = await this.resend.emails.send(
      {
        from: env.email_from,
        to: [notification.recipient],
        subject: notification.subject,
        html: notification.htmlContent,
        text: notification.textContent ?? undefined,
      },
      { idempotencyKey: `notification/${notification.id}` },
    );

    if (error || !data?.id) {
      throw new Error(error?.message ?? 'Resend could not send the email.');
    }
    return data.id;
  }
}