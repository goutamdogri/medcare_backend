import { query } from '../../config/database.js';
import type { ForecastItem, ForecastQuery, ModelMix } from './forecasts.schemas.js';
import { toNumRounded } from '../../shared/utils/mapping.js';

interface ForecastRow {
  sku_id: string;
  region: string;
  atc_code: string;
  forecast_date: string;
  horizon: number;
  p10: string;
  p50: string;
  p90: string;
  momentum_u: string | null;
  flu_ratio: string | null;
  sense_adjustment: string | null;
  total_count: string;
}

function mapForecast(row: ForecastRow): ForecastItem {
  return {
    skuId: row.sku_id,
    region: row.region,
    atcCode: row.atc_code,
    forecastDate: row.forecast_date,
    horizon: Number(row.horizon),
    p10: toNumRounded(row.p10, 2)!,
    p50: toNumRounded(row.p50, 2)!,
    p90: toNumRounded(row.p90, 2)!,
    momentumU: toNumRounded(row.momentum_u, 4),
    fluRatio: toNumRounded(row.flu_ratio, 4),
    senseAdjustment: toNumRounded(row.sense_adjustment, 4),
  };
}

export interface ForecastsPage {
  content: ForecastItem[];
  totalElements: number;
}

/** Filtered + paginated forecast rows for one pipeline run. */
export async function listForecasts(
  asOf: string,
  filters: Omit<ForecastQuery, 'page' | 'size' | 'asOf'>,
  page: number,
  size: number,
): Promise<ForecastsPage> {
  const clauses = ['as_of_date = $1'];
  const params: unknown[] = [asOf];

  if (filters.skuId !== undefined) {
    params.push(filters.skuId);
    clauses.push(`sku_id = $${params.length}`);
  }
  if (filters.region !== undefined) {
    params.push(filters.region);
    clauses.push(`region = $${params.length}`);
  }
  if (filters.atcCode !== undefined) {
    params.push(filters.atcCode);
    clauses.push(`atc_code = $${params.length}`);
  }
  if (filters.horizonMax !== undefined) {
    params.push(filters.horizonMax);
    clauses.push(`horizon <= $${params.length}`);
  }

  const where = clauses.join(' AND ');
  const offset = page * size;
  const dataParams = [...params, size, offset];

  const result = await query<ForecastRow>(
    `SELECT sku_id, region, atc_code, (forecast_date)::text AS forecast_date, horizon,
            p10, p50, p90, momentum_u, flu_ratio, sense_adjustment,
            COUNT(*) OVER() AS total_count
     FROM forecasts_final
     WHERE ${where}
     ORDER BY sku_id, region, forecast_date, horizon
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  let totalElements = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  if (totalElements === 0 && result.rows.length === 0) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM forecasts_final WHERE ${where}`,
      params,
    );
    totalElements = Number(countResult.rows[0]?.count ?? 0);
  }

  return {
    content: result.rows.map(mapForecast),
    totalElements,
  };
}

/** Ensemble weights recorded for this run (surfaced as `modelMix`). */
export async function fetchModelMix(asOf: string): Promise<ModelMix> {
  const result = await query<{ lgbm_weight: string | null; chronos_weight: string | null }>(
    `SELECT lgbm_weight, chronos_weight FROM rolling_run_log
     WHERE as_of_date = $1 AND status = 'success'`,
    [asOf],
  );
  const row = result.rows[0];
  return {
    lgbm: row ? toNumRounded(row.lgbm_weight, 3) : null,
    chronos: row ? toNumRounded(row.chronos_weight, 3) : null,
  };
}
