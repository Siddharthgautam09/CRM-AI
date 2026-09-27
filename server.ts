import { app } from './app';
import { connectDatabases, disconnectDatabases } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';


let server: ReturnType<typeof app.listen> | null = null;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ signal }, 'Graceful shutdown started');

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await disconnectDatabases();
  logger.info('Shutdown completed');
  process.exit(0);
};

const bootstrap = async (): Promise<void> => {
  try {
    await connectDatabases();

    server = app.listen(env.port, () => {
      logger.info(`Server listening on port ${env.port}`);
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to bootstrap server');
    process.exit(1);
  }
};

void bootstrap();
