import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../../shared/errors/api-errors.js';
import { verifyAccessToken, type TokenPayload } from './jwt.js';

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Guards a route. Reads the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to `req.user`.
 *
 * Throws a structured 401 through the central error handler otherwise.
 */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(ApiError.unauthorized('Missing session token'));
    return;
  }

  // verifyAccessToken throws a clean ApiError(401) on any failure.
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export type { RequestHandler };
