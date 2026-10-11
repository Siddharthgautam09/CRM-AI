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

  // ── modules/platform (Super Admin console) ────────────────────────────────
  AUTH_SERVICE_BASE_URL: z.string().url().default('http://localhost:8102'),
  TENANT_SERVICE_BASE_URL: z.string().url().default('http://localhost:8103'),
  // Same shared secret every Gen_MS service in this stack gates /internal/**
  // with — modules/auth, modules/tenant, and this app's own webhook receiver.
  INTERNAL_SERVICE_SECRET: z.string().min(8),
  // PEM contents (not a path) so the same env var works identically whether
  // this app runs on the host or in a container.
  AUTH_JWT_PUBLIC_KEY: z.string().min(1),
  AUTH_JWT_ISSUER: z.string().default('https://auth.example.com'),
  AUTH_JWT_AUDIENCE: z.string().default('example-api'),
  BROKERAGE_EXPORT_DOWNLOAD_DAYS: z.coerce.number().int().min(1).default(7),
  BROKERAGE_EXPORT_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),

  // ── modules/platform — usage & AI cost (Gen_USG) ───────────────────────────
  // Gen_USG's own Postgres — connect as its unprivileged genusg_app role
  // (created by its own migration), not the superuser used to run migrations.
  USAGE_DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://genusg_app:genusg_app@localhost:5435/genusg'),
  USAGE_REDIS_URL: z.string().default('redis://localhost:6382'),
  AI_COST_DAILY_LIMIT: z.coerce.number().positive().default(50),
  AI_COST_OVERRIDE_LIMIT: z.coerce.number().positive().default(100),

  // ── modules/crm — Google OAuth (Connect email/calendar, Flow 4.7/4.8) ──────
  // Empty by default so the app still boots without this feature configured —
  // google-oauth.client.ts throws a clear error at call time instead, same
  // pattern as modauth's optional JavaMailSender bean.
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default('http://localhost:3000/api/v1/crm/integrations/google/callback'),
  // 32-byte hex key for AES-256-GCM token-at-rest encryption — this dev
  // default is fine for local/test; override it in any real deployment.
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .default('eed03caf5b9fad03e8fb6243a466ed9d2eda77b629fa50899c4eff234b68f8cc'),
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
  platform: {
    authServiceBaseUrl: e.AUTH_SERVICE_BASE_URL,
    tenantServiceBaseUrl: e.TENANT_SERVICE_BASE_URL,
    internalSecret: e.INTERNAL_SERVICE_SECRET,
    authJwtPublicKey: e.AUTH_JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    authJwtIssuer: e.AUTH_JWT_ISSUER,
    authJwtAudience: e.AUTH_JWT_AUDIENCE,
    exportDownloadDays: e.BROKERAGE_EXPORT_DOWNLOAD_DAYS,
    exportRetentionDays: e.BROKERAGE_EXPORT_RETENTION_DAYS,
    usageDatabaseUrl: e.USAGE_DATABASE_URL,
    usageRedisUrl: e.USAGE_REDIS_URL,
    aiCostDailyLimit: e.AI_COST_DAILY_LIMIT,
    aiCostOverrideLimit: e.AI_COST_OVERRIDE_LIMIT,
  },
  google: {
    clientId: e.GOOGLE_CLIENT_ID,
    clientSecret: e.GOOGLE_CLIENT_SECRET,
    redirectUri: e.GOOGLE_REDIRECT_URI,
    tokenEncryptionKey: e.TOKEN_ENCRYPTION_KEY,
  },
} as const;
