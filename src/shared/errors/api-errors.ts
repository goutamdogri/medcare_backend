/**
 * Application error hierarchy.
 *
 * Every expected failure carries an HTTP status plus a stable machine-readable
 * `error` code; the central error middleware renders these into the standard
 * JSON envelope. Anything thrown that is NOT an ApiError is treated as an
 * unexpected server fault and sanitized before reaching the client.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, new.target);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static notFound(message: string, code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, code, message);
  }

  static notImplemented(message: string): ApiError {
    return new ApiError(501, 'NOT_IMPLEMENTED', message);
  }

  static serviceUnavailable(message: string): ApiError {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }
}

/** Thrown when a requested pipeline run (asOf) has no successful record. */
export class RunNotFoundError extends ApiError {
  constructor(asOf: string) {
    super(404, 'RUN_NOT_FOUND', `No run found for asOf=${asOf}`);
  }
}
