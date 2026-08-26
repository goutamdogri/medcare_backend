import { z } from 'zod';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../errors/api-errors.js';
import { logger } from '../../config/logger.js';

interface ErrorEnvelope {
  status: number;
  error: string;
  message?: string;
  details?: unknown;
  path: string;
  requestId?: string;
  timestamp: string;
}

function zodIssuesToDetails(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Central error renderer. Guarantees that every failure — validation,
 * domain 404s, malformed JSON, or an unexpected crash — leaves the API as a
 * consistent JSON envelope and never as a stack trace.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Malformed JSON body sent by the client.
  if (
    err instanceof SyntaxError &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    render(res, req, {
      status: 400,
      error: 'INVALID_JSON',
      message: 'Request body is not valid JSON',
    });
    return;
  }

  // Request body exceeded the configured size limit.
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    render(res, req, {
      status: 413,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds the allowed size limit',
    });
    return;
  }

  if (err instanceof z.ZodError) {
    render(res, req, {
      status: 400,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: zodIssuesToDetails(err),
    });
    return;
  }

  if (err instanceof ApiError) {
    render(res, req, {
      status: err.status,
      error: err.code,
      ...(err.message !== err.code ? { message: err.message } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Unexpected fault — log full detail server-side, sanitize what we emit.
  logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  render(res, req, {
    status: 500,
    error: 'INTERNAL_ERROR',
    message:
      envIsProd() ? 'An unexpected error occurred' : String((err as Error)?.message ?? err),
  });
}

function envIsProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function render(
  res: Response,
  req: Request,
  body: Omit<ErrorEnvelope, 'path' | 'timestamp' | 'requestId'>,
): void {
  const envelope: ErrorEnvelope = {
    ...body,
    path: req.originalUrl,
    requestId: typeof req.id === 'string' ? req.id : undefined,
    timestamp: new Date().toISOString(),
  };
  res.status(body.status).json(envelope);
}

/** Express 5 catch-all for unmatched routes, rendered in the same envelope. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} does not exist`));
}

/** Convenience wrapper so middleware chains can raise ApiErrors inline. */
export function requireCondition(condition: boolean, makeError: () => ApiError): RequestHandler {
  return (_req, _res, next) => {
    if (!condition) next(makeError());
    else next();
  };
}
