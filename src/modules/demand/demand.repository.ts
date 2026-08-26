import { query } from '../../config/database.js';
import type { DemandPoint, FluPoint } from './demand.schemas.js';

interface DemandRow {
  date: string;
  units: number;
}

export async function getDemandMaxDate(): Promise<string | null> {
  const result = await query<{ max_date: string | null }>(
    `SELECT MAX(date)::text AS max_date FROM demand_history`,
  );
  return result.rows[0]?.max_date ?? null;
}

/** Raw daily rows for a single SKU×region slice (chart series). */
export async function listDemandRaw(
  skuId: string,
  region: string,
  from: string,
  to: string,
): Promise<DemandPoint[]> {
  const result = await query<DemandRow>(
    `SELECT (date)::text AS date, units
     FROM demand_history
     WHERE sku_id = $1 AND region = $2 AND date BETWEEN $3 AND $4
     ORDER BY date`,
    [skuId, region, from, to],
  );
  return result.rows.map((r) => ({ date: r.date, units: Number(r.units) }));
}

/**
 * Date-aggregated totals across the whole network (or a partial filter such as
 * one SKU across all regions). Keeps payloads bounded regardless of grain.
 */
export async function sumDemandGrouped(
  skuId: string | undefined,
  region: string | undefined,
  from: string,
  to: string,
): Promise<DemandPoint[]> {
  const clauses = ['date BETWEEN $1 AND $2'];
  const params: unknown[] = [from, to];
  if (skuId !== undefined) {
    params.push(skuId);
    clauses.push(`sku_id = $${params.length}`);
  }
  if (region !== undefined) {
    params.push(region);
    clauses.push(`region = $${params.length}`);
  }
  const result = await query<DemandRow>(
    `SELECT (date)::text AS date, SUM(units)::int AS units
     FROM demand_history
     WHERE ${clauses.join(' AND ')}
     GROUP BY date ORDER BY date`,
    params,
  );
  return result.rows.map((r) => ({ date: r.date, units: Number(r.units) }));
}

export async function getFluMaxDate(): Promise<string | null> {
  const result = await query<{ max_date: string | null }>(
    `SELECT MAX(record_date)::text AS max_date FROM disease_burden_index`,
  );
  return result.rows[0]?.max_date ?? null;
}

interface FluRow {
  record_date: string;
  region: string;
  index_value: string;
}

export async function listFlu(
  region: string | undefined,
  from: string,
  to: string,
): Promise<FluPoint[]> {
  const clauses = ['record_date BETWEEN $1 AND $2'];
  const params: unknown[] = [from, to];
  if (region !== undefined) {
    params.push(region);
    clauses.push(`region = $${params.length}`);
  }
  const result = await query<FluRow>(
    `SELECT (record_date)::text AS record_date, region, index_value
     FROM disease_burden_index
     WHERE ${clauses.join(' AND ')}
     ORDER BY record_date, region`,
    params,
  );
  return result.rows.map((r) => ({
    date: r.record_date,
    region: r.region,
    indexValue: Number(r.index_value),
  }));
}
