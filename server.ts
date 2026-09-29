import { app } from './app';
import { connectDatabases, disconnectDatabases } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { purgeExpiredExports } from './modules/platform/export.service';

let server: ReturnType<typeof app.listen> | null = null;
let exportPurgeInterval: ReturnType<typeof setInterval> | null = null;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ signal }, 'Graceful shutdown started');

  if (exportPurgeInterval) {
    clearInterval(exportPurgeInterval);
  }

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

    // No internal scheduler in export.service.ts itself (matches the rest of
    // the Gen_MS family's convention — host-triggered sweeps, see its own
    // comment) — this is the host trigger. Hourly is fine for a
    // multi-day retention window; not worth a real cron dependency.
    exportPurgeInterval = setInterval(
      () => {
        purgeExpiredExports()
          .then((count) => {
            if (count > 0) logger.info({ count }, 'Purged expired brokerage exports');
          })
          .catch((error: unknown) => logger.error({ error }, 'Brokerage export purge failed'));
      },
      60 * 60 * 1000,
    );

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
