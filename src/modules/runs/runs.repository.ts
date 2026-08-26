import { query } from '../../config/database.js';
import type { RunItem } from './runs.schemas.js';
import { csvToArray, toIsoTimestamp, toNumRounded } from '../../shared/utils/mapping.js';

interface RunRow {
  id: number;
  as_of_date: string;
  previous_as_of_date: string | null;
  models_used: string | null;
  lgbm_weight: string | null;
  chronos_weight: string | null;
  wmape: string | null;
  forecast_rows: number | null;
  status: string;
  error_message: string | null;
  run_duration_seconds: number | null;
  triggered_by: string;
  created_at: Date | string;
}

function mapRun(row: RunRow): RunItem {
  return {
    id: Number(row.id),
    asOfDate: row.as_of_date,
    previousAsOfDate: row.previous_as_of_date,
    modelsUsed: csvToArray(row.models_used),
    lgbmWeight: toNumRounded(row.lgbm_weight, 3),
    chronosWeight: toNumRounded(row.chronos_weight, 3),
    wmape: toNumRounded(row.wmape, 4),
    forecastRows: row.forecast_rows === null ? null : Number(row.forecast_rows),
    status: row.status,
    errorMessage: row.error_message,
    durationSeconds:
      row.run_duration_seconds === null ? null : Number(row.run_duration_seconds),
    triggeredBy: row.triggered_by,
    createdAt: toIsoTimestamp(row.created_at)!,
  };
}

/** Audit trail, newest runs first. */
export async function listRuns(
  page: number,
  size: number,
): Promise<{ content: RunItem[]; totalElements: number }> {
  const result = await query<RunRow & { total_count: string }>(
    `SELECT id, (as_of_date)::text AS as_of_date,
            (previous_as_of_date)::text AS previous_as_of_date,
            models_used, lgbm_weight, chronos_weight, wmape, forecast_rows,
            status, error_message, run_duration_seconds, triggered_by, created_at,
            COUNT(*) OVER() AS total_count
     FROM rolling_run_log
     ORDER BY as_of_date DESC
     LIMIT $1 OFFSET $2`,
    [size, page * size],
  );
  let totalElements = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  if (totalElements === 0 && result.rows.length === 0) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM rolling_run_log`,
    );
    totalElements = Number(countResult.rows[0]?.count ?? 0);
  }
  return {
    content: result.rows.map(mapRun),
    totalElements,
  };
}
