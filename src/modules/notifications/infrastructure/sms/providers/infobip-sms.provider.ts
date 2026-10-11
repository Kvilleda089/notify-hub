import { Injectable, Logger } from "@nestjs/common";
import { env } from "src/config";
import type { SmsMessage, SmsProvider } from "../../../domain/interface/sms-provider.interface";

@Injectable()
export class InfobipSmsProvider implements SmsProvider {
  readonly name = "INFOBIP";
  private readonly logger = new Logger(InfobipSmsProvider.name);

  async send({ to, text, reference }: SmsMessage): Promise<string> {
    const baseUrl = `https://${env.infobip_base_url.replace(/^https?:\/\//, "")}`;

    const response = await fetch(`${baseUrl}/sms/3/messages`, {
      method: "POST",
      headers: {
        Authorization: `App ${env.infobip_api_key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            sender: env.infobip_sender,
            destinations: [{ to: to.replace(/^\+/, "") }],
            content: { text },
          },
        ],
      }),
    });

    const body: any = await response.json().catch(() => ({}));
    const message = body?.messages?.[0];

    if (!response.ok || !message?.messageId || message?.status?.groupName === "REJECTED") {
      this.logger.error(`Infobip SMS failed for ${reference}: ${JSON.stringify(body)}`);
      throw new Error(`Infobip error ${response.status}: ${JSON.stringify(body)}`);
    }

    return message.messageId;
  }
}