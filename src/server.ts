/**
 * Process bootstrap.
 *
 * Early error detection (fail fast):
 * 1. `uncaughtException` / `unhandledRejection` handlers registered before
 *    anything else can throw.
 * 2. Environment validated synchronously at import time (src/config/env.ts).
 * 3. Database connectivity + schema completeness verified BEFORE the port
 *    opens — a misconfigured deployment dies immediately with a clear reason
 *    instead of serving 500s.
 * 4. Graceful shutdown on SIGTERM/SIGINT: stop accepting connections, drain
 *    in-flight requests, close the pool, hard-exit after a safety timeout.
 */
import { createApp } from './app.js';
import {
  assertSchema,
  checkDatabase,
  closeDatabase,
} from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException — exiting');
  // eslint-disable-next-line no-console -- logger may itself be broken
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandledRejection — exiting');
  process.exit(1);
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  try {
    await checkDatabase();
    await assertSchema();
    logger.info('Database connectivity and schema checks passed');
  } catch (err) {
    logger.fatal({ err }, 'Startup self-check failed — refusing to start');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`medcare-backend listening on :${env.PORT} (${env.NODE_ENV})`);
    logger.info(`API docs: http://localhost:${env.PORT}/api-docs`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutdown initiated');
    const forceTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    server.close(async () => {
      try {
        await closeDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
