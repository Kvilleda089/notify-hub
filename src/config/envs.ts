import 'dotenv/config';
import * as joi from 'joi';


interface EnVars {
  PORT: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
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

}