import 'dotenv/config';
import * as joi from 'joi';
import { SMS_PROVIDER_NAMES, type SmsProviderName } from './sms-providers';

interface EnVars {
  PORT: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_TLS: boolean;
  ADMIN_API_TOKEN: string;
  API_KEY_PEPPER: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;

  SMS_PROVIDER: SmsProviderName;
  INFOBIP_API_KEY: string;
  INFOBIP_BASE_URL: string;
  INFOBIP_SENDER: string;
}

// Las credenciales de un proveedor solo son obligatorias si ese proveedor está activo
const requiredWhen = (provider: SmsProviderName) =>
  joi.string().when('SMS_PROVIDER', {
    is: provider,
    then: joi.string().required(),
    otherwise: joi.string().allow('').default(''),
  });

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    REDIS_PASSWORD: joi.string().allow('').default(''),
    REDIS_TLS: joi.boolean().default(false),
    ADMIN_API_TOKEN: joi.string().required(),
    API_KEY_PEPPER: joi.string().required(),
    RESEND_API_KEY: joi.string().required(),
    EMAIL_FROM: joi.string().required(),

    SMS_PROVIDER: joi.string().valid(...SMS_PROVIDER_NAMES).default('mock'),
    INFOBIP_API_KEY: requiredWhen('infobip'),
    INFOBIP_BASE_URL: requiredWhen('infobip'),
    INFOBIP_SENDER: joi.string().default('ServiceSMS'),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnVars = value;

export const env = {
  port: envVars.PORT,
  database_url: envVars.DATABASE_URL,
  redis_host: envVars.REDIS_HOST,
  redis_port: envVars.REDIS_PORT,
  redis_password: envVars.REDIS_PASSWORD,
  redis_tls: envVars.REDIS_TLS,
  admin_api_token: envVars.ADMIN_API_TOKEN,
  api_key_pepper: envVars.API_KEY_PEPPER,
  resend_api_key: envVars.RESEND_API_KEY,
  email_from: envVars.EMAIL_FROM,
  sms_provider: envVars.SMS_PROVIDER,
  infobip_api_key: envVars.INFOBIP_API_KEY,
  infobip_base_url: envVars.INFOBIP_BASE_URL,
  infobip_sender: envVars.INFOBIP_SENDER,
};