"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
let server = null;
const shutdown = async (signal) => {
    logger_1.logger.info({ signal }, 'Graceful shutdown started');
    if (server) {
        await new Promise((resolve, reject) => {
            server?.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    await (0, database_1.disconnectDatabases)();
    logger_1.logger.info('Shutdown completed');
    process.exit(0);
};
const bootstrap = async () => {
    try {
        await (0, database_1.connectDatabases)();
        server = app_1.app.listen(env_1.env.port, () => {
            logger_1.logger.info(`Server listening on port ${env_1.env.port}`);
        });
        process.on('SIGINT', () => {
            void shutdown('SIGINT');
        });
        process.on('SIGTERM', () => {
            void shutdown('SIGTERM');
        });
    }
    catch (error) {
        logger_1.logger.fatal({ error }, 'Failed to bootstrap server');
        process.exit(1);
    }
};
void bootstrap();
