/**
 * Thin HTTP client for the ML sidecar (FastAPI on ML_SIDECAR_URL).
 *
 * The controller layer turns the sidecar's responses into REST-facing shapes;
 * this module only owns the transport concerns:
 *  - a hard timeout via AbortController so a hung sidecar cannot hang a request,
 *  - a small idempotent-trigger retry for transient network failures.
 */
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from './errors/api-errors.js';

type JsonBody = Record<string, unknown>;

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

async function request(
  method: 'GET' | 'POST',
  path: string,
  body?: JsonBody,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(`${env.ML_SIDECAR_URL}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw ApiError.serviceUnavailable(
          `ML sidecar error (${response.status}): ${text || response.statusText}`,
        );
      }
      return (await response.json().catch(() => ({}))) as unknown;
    } catch (err) {
      lastError = err;
      // Keep retrying only on transient failures; surface API errors immediately.
      if (err instanceof ApiError) {
        throw err;
      }
      if (attempt < MAX_ATTEMPTS) {
        const delay = 150 * 2 ** (attempt - 1);
        logger.warn(
          { path, attempt, err },
          'Transient ML sidecar failure — retrying',
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw ApiError.serviceUnavailable(
    `ML sidecar unreachable (${method} ${path}): ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export const mlClient = {
  post: (path: string, body?: JsonBody) => request('POST', path, body),
  get: (path: string) => request('GET', path),
};

export type MlClient = typeof mlClient;
