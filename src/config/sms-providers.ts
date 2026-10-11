

export const SMS_PROVIDER_NAMES = ['mock', 'infobip'] as const;
export type SmsProviderName = (typeof SMS_PROVIDER_NAMES)[number];