export interface SmsMessage {
  to: string;        
  text: string;
  reference: string; 
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<string>;
}

export const SMS_PROVIDER_TOKEN = Symbol('SMS_PROVIDER');