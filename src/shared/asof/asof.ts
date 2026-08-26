import { z } from 'zod';
import { query } from '../../config/database.js';
import { ApiError, RunNotFoundError } from '../errors/api-errors.js';

/**
 * `asOf` convention (spec §3.1): every run-scoped endpoint accepts an optional
 * ISO date. When omitted, the latest *successful* pipeline run is used; when
 * provided, the date must match a successful run or the API answers 404.
 */
export const asOfQuerySchema = z.object({
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf must be an ISO date (yyyy-MM-dd)')
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'asOf must be a real calendar date' })
    .optional(),
});

/** Latest as_of_date with a successful run, or null when the log is empty. */
export async function getLatestRunDate(): Promise<string | null> {
  const result = await query<{ as_of_date: string | null }>(
    `SELECT MAX(as_of_date)::text AS as_of_date FROM rolling_run_log WHERE status = 'success'`,
  );
  return result.rows[0]?.as_of_date ?? null;
}

async function hasSuccessfulRun(asOf: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM rolling_run_log WHERE as_of_date = $1 AND status = 'success')`,
    [asOf],
  );
  return result.rows[0]?.exists === true;
}

/**
 * Resolve the effective asOf for a request.
 * @param requested optional client-supplied yyyy-MM-dd
 * @returns resolved date string, echoed back to clients as `"asOf"`
 */
export async function resolveAsOf(requested?: string): Promise<string> {
  if (requested) {
    if (!(await hasSuccessfulRun(requested))) {
      throw new RunNotFoundError(requested);
    }
    return requested;
  }
  const latest = await getLatestRunDate();
  if (!latest) {
    throw ApiError.notFound('No successful pipeline run available yet', 'RUN_NOT_FOUND');
  }
  return latest;
}
