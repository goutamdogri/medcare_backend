import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/errors/api-errors.js';

/** Payload carried inside a signed access token. */
export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as StringValue,
    issuer: 'medcare-backend',
    audience: 'medcare-spa',
  });
}

/** Verifies a raw token and returns the payload, or throws a clean 401. */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'medcare-backend',
      audience: 'medcare-spa',
    });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new ApiError(401, 'INVALID_TOKEN', 'Token payload is malformed');
    }
    return {
      sub: decoded.sub,
      email: String(decoded.email ?? ''),
      role: String(decoded.role ?? 'viewer'),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Session has expired — please sign in again');
    }
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or malformed session token');
  }
}
