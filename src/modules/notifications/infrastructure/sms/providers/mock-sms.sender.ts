import { Injectable, Logger } from "@nestjs/common";
import type { SmsMessage, SmsProvider } from "../../../domain/interface/sms-provider.interface";

@Injectable()
export class MockSmsProvider implements SmsProvider {
  readonly name = "MOCK_SMS";
  private readonly logger = new Logger(MockSmsProvider.name);

  async send({ to, text, reference }: SmsMessage): Promise<string> {
    this.logger.log(`[MOCK] SMS a ${to}: "${text}"`);
    return `mock_${reference}`;
  }
}