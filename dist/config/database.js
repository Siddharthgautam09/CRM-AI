"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabases = exports.connectDatabases = exports.disconnectMongoose = exports.connectMongoose = exports.disconnectPrisma = exports.connectPrisma = exports.getPrismaClient = void 0;
const client_1 = require("@prisma/client");
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const logger_1 = require("./logger");
let prismaClient = null;
const getPrismaClient = () => {
    if (!prismaClient) {
        prismaClient = new client_1.PrismaClient();
    }
    return prismaClient;
};
exports.getPrismaClient = getPrismaClient;
const connectPrisma = async () => {
    const client = (0, exports.getPrismaClient)();
    await client.$connect();
    logger_1.logger.info('Connected to PostgreSQL via Prisma');
};
exports.connectPrisma = connectPrisma;
const disconnectPrisma = async () => {
    if (!prismaClient)
        return;
    await prismaClient.$disconnect();
    logger_1.logger.info('Disconnected Prisma client');
};
exports.disconnectPrisma = disconnectPrisma;
const connectMongoose = async () => {
    await mongoose_1.default.connect(env_1.env.mongodbUri);
    logger_1.logger.info('Connected to MongoDB via Mongoose');
};
exports.connectMongoose = connectMongoose;
const disconnectMongoose = async () => {
    if (mongoose_1.default.connection.readyState === 0)
        return;
    await mongoose_1.default.disconnect();
    logger_1.logger.info('Disconnected Mongoose client');
};
exports.disconnectMongoose = disconnectMongoose;
const connectDatabases = async () => {
    if (env_1.env.dbClient === 'prisma') {
        await (0, exports.connectPrisma)();
        return;
    }
    if (env_1.env.dbClient === 'mongoose') {
        await (0, exports.connectMongoose)();
        return;
    }
    await Promise.all([(0, exports.connectPrisma)(), (0, exports.connectMongoose)()]);
};
exports.connectDatabases = connectDatabases;
const disconnectDatabases = async () => {
    await Promise.all([(0, exports.disconnectPrisma)(), (0, exports.disconnectMongoose)()]);
};
exports.disconnectDatabases = disconnectDatabases;
