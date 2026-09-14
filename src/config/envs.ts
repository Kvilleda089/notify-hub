import 'dotenv/config';
import * as joi from 'joi';


interface EnVars {
  PORT: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  ADMIN_API_TOKEN: string; 
  API_KEY_PEPPER: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    ADMIN_API_TOKEN: joi.string().required(),
    API_KEY_PEPPER: joi.string().required(),
    RESEND_API_KEY: joi.string().required(),
    EMAIL_FROM: joi.string().required(),

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
    admin_api_token: envVars.ADMIN_API_TOKEN,
    api_key_pepper:  envVars.API_KEY_PEPPER,
    resend_api_key: envVars.RESEND_API_KEY,
    email_from: envVars.EMAIL_FROM,
}