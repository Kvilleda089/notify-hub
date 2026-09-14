import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from 'src/config';

type SendEmailInput = {
  id: string;
  recipient: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
};

@Injectable()
export class ResendEmailService {
  private readonly resend = new Resend(env.resend_api_key);

  async send(input: SendEmailInput): Promise<string> {
    const { data, error } = await this.resend.emails.send(
      {
        from: env.email_from,
        to: [input.recipient],
        subject: input.subject,
        html: input.htmlContent,
        text: input.textContent ?? undefined,
      },
      {
        idempotencyKey: `notification/${input.id}`,
      },
    );

    if (error || !data?.id) {
      throw new Error(error?.message ?? 'Resend could not send the email.');
    }

    return data.id;
  }
}