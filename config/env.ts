import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().default('Enterprise Backend Template'),
  API_PREFIX: z.string().default('/api/v1'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  DB_CLIENT: z.enum(['prisma', 'mongoose', 'both']).default('prisma'),
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string().min(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast in startup for invalid env.
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

const e = parsed.data;

export const env = {
  nodeEnv: e.NODE_ENV,
  port: e.PORT,
  appName: e.APP_NAME,
  apiPrefix: e.API_PREFIX,
  allowedOrigins: e.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
  logLevel: e.LOG_LEVEL,
  bcryptSaltRounds: e.BCRYPT_SALT_ROUNDS,
  dbClient: e.DB_CLIENT,
  databaseUrl: e.DATABASE_URL,
  mongodbUri: e.MONGODB_URI,
  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
  },
} as const;
