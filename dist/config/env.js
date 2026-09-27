"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    APP_NAME: zod_1.z.string().default('Enterprise Backend Template'),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().int().min(4).max(15).default(12),
    DB_CLIENT: zod_1.z.enum(['prisma', 'mongoose', 'both']).default('prisma'),
    DATABASE_URL: zod_1.z.string().url(),
    MONGODB_URI: zod_1.z.string().min(10),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // Fail fast in startup for invalid env.
    throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}
const e = parsed.data;
exports.env = {
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
};
