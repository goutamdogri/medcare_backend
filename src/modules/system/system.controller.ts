import type { Request, Response } from 'express';
import { checkDatabase } from '../../config/database.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { ApiError } from '../../shared/errors/api-errors.js';

/**
 * Liveness/readiness probe for CI deploy checks and load balancers.
 * Verifies process uptime AND database reachability; answers 503 otherwise.
 */
export const getHealthHandler = asyncHandler(async (_req: Request, res: Response) => {
  let dbUp = true;
  try {
    await checkDatabase();
  } catch {
    dbUp = false;
  }

  const body = {
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    env: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  if (!dbUp) {
    throw ApiError.serviceUnavailable('Database is unreachable');
  }
  res.json(body);
});
