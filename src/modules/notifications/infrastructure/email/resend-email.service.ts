import { Injectable } from "@nestjs/common";
import { Resend } from 'resend';
import { env } from "src/config";



type SendEmailInput = {
    id: string;
    recipient: string;
    subject: string | null;
    templateCode: string;
    payload: unknown;
};

@Injectable()
export class ResendEmailService {

    private readonly resend = new Resend(env.resend_api_key);

    async send(input: SendEmailInput): Promise<string> {
        const payload = typeof input.payload === 'object' && input.payload !== null
            ? input.payload as Record<string, unknown>
            : {};

        if (input.templateCode !== 'payment-confirmed') {
            throw new Error(`Unsupported template: ${input.templateCode}`);
        }

        const name = String(payload.name ?? 'Cliente');
        const orderNumber = String(payload.orderNumber ?? '');

        const { data, error } = await this.resend.emails.send(
            {
                from: env.email_from,
                to: [input.recipient],
                subject: input.subject ?? `Pago confirmado #${orderNumber}`,
                html: `
          <h1>Pago confirmado</h1>
          <p>Hola ${name},</p>
          <p>Tu pago para la orden <strong>#${orderNumber}</strong> fue confirmado.</p>
        `,
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