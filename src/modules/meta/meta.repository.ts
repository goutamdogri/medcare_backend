import { query } from '../../config/database.js';
import type { LatestRun, RegionSummary, SkuSummary } from './meta.schemas.js';
import { csvToArray, toIsoTimestamp, toNumRounded } from '../../shared/utils/mapping.js';

interface SkuRow {
  sku_id: string;
  brand_name: string;
  atc_code: string;
  manufacturer: string;
  regulatory_class: string;
  nlem_listed: boolean;
  criticality: string;
  unit_cost_inr: number;
  shelf_life_days: number;
}

interface LocationRow {
  location_id: string;
  name: string;
  type: string;
  capacity_units: number;
  city: string | null;
  state: string | null;
}

interface RunRow {
  created_at: Date | string | null;
  status: string;
  models_used: string | null;
  lgbm_weight: string | null;
  chronos_weight: string | null;
  wmape: string | null;
  run_duration_seconds: number | null;
}

function mapSku(row: SkuRow): SkuSummary {
  return {
    skuId: row.sku_id,
    brandName: row.brand_name,
    atcCode: row.atc_code,
    manufacturer: row.manufacturer,
    regulatoryClass: row.regulatory_class,
    nlemListed: row.nlem_listed,
    criticality: row.criticality,
    unitCostInr: Number(row.unit_cost_inr),
    shelfLifeDays: Number(row.shelf_life_days),
  };
}

function mapRegion(row: LocationRow): RegionSummary {
  return {
    locationId: row.location_id,
    name: row.name,
    type: row.type,
    capacityUnits: Number(row.capacity_units),
    city: row.city,
    state: row.state,
  };
}

export function mapLatestRun(row: RunRow): LatestRun {
  return {
    ranAt: toIsoTimestamp(row.created_at),
    status: row.status,
    modelsUsed: csvToArray(row.models_used),
    lgbmWeight: toNumRounded(row.lgbm_weight, 3),
    chronosWeight: toNumRounded(row.chronos_weight, 3),
    wmape: toNumRounded(row.wmape, 4),
    durationSeconds: row.run_duration_seconds === null ? null : Number(row.run_duration_seconds),
  };
}

export async function fetchSkus(): Promise<SkuSummary[]> {
  const result = await query<SkuRow>(
    `SELECT sku_id, brand_name, atc_code, manufacturer, regulatory_class,
            nlem_listed, criticality, unit_cost_inr, shelf_life_days
     FROM sku_master ORDER BY sku_id`,
  );
  return result.rows.map(mapSku);
}

export async function fetchRegions(): Promise<RegionSummary[]> {
  const result = await query<LocationRow>(
    `SELECT location_id, name, type, capacity_units, city, state
     FROM locations ORDER BY location_id`,
  );
  return result.rows.map(mapRegion);
}

/** Most recent successful run row (used for the `latestRun` block). */
export async function fetchLatestSuccessfulRun(): Promise<LatestRun | null> {
  const result = await query<RunRow>(
    `SELECT created_at, status, models_used, lgbm_weight, chronos_weight, wmape, run_duration_seconds
     FROM rolling_run_log WHERE status = 'success'
     ORDER BY as_of_date DESC LIMIT 1`,
  );
  const row = result.rows[0];
  return row ? mapLatestRun(row) : null;
}
