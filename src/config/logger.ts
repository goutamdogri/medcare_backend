import pino from 'pino';
import { env } from './env.js';

/** Root application logger. Request-scoped logging goes through pino-http. */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'medcare-backend', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
    censor: '[redacted]',
  },
});
