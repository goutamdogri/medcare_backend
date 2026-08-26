import { query } from '../../config/database.js';
import type {
  MasterLane,
  MasterLocation,
  MasterSku,
} from './master.schemas.js';
import { mapKeysToCamel, toIsoTimestamp } from '../../shared/utils/mapping.js';

type Row = Record<string, unknown>;

function mapDates<T extends object>(row: Row, keys: string[]): T {
  const out: Row = { ...row, id: Number(row.id) }; // BIGINT ids arrive as strings
  for (const key of keys) {
    out[key] = toIsoTimestamp(row[key]);
  }
  return mapKeysToCamel(out) as T;
}

const SKU_DATE_KEYS = ['created_at', 'updated_at'];
const LOCATION_DATE_KEYS = ['created_at', 'updated_at'];
const LANE_DATE_KEYS = ['created_at'];

export async function fetchAllSkus(): Promise<MasterSku[]> {
  const result = await query<Row>(`SELECT * FROM sku_master ORDER BY sku_id`);
  return result.rows.map((r) => mapDates<MasterSku>(r, SKU_DATE_KEYS));
}

export async function fetchAllLocations(): Promise<MasterLocation[]> {
  const result = await query<Row>(`SELECT * FROM locations ORDER BY location_id`);
  return result.rows.map((r) => mapDates<MasterLocation>(r, LOCATION_DATE_KEYS));
}

export async function fetchAllLanes(): Promise<MasterLane[]> {
  const result = await query<Row>(`SELECT * FROM lanes ORDER BY from_location, to_location, mode`);
  return result.rows.map((r) => mapDates<MasterLane>(r, LANE_DATE_KEYS));
}
