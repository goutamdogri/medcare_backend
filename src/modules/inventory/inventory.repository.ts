import { query } from '../../config/database.js';
import type { AgingBucket, AgingRow, InventoryStatusRow } from './inventory.schemas.js';

interface BucketRow {
  location: string;
  sku_id: string;
  bucket: string;
  units: string;
  value_inr: string;
}

export async function resolveSnapshotDate(asOf: string): Promise<string | null> {
  const result = await query<{ snapshot: string | null }>(
    `SELECT MAX(as_of_date)::text AS snapshot FROM inventory_batches WHERE as_of_date <= $1`,
    [asOf],
  );
  return result.rows[0]?.snapshot ?? null;
}

/** Expiry-bucket aggregates per location × SKU for one batch snapshot. */
export async function fetchBucketRows(snapshot: string): Promise<AgingRow[]> {
  const result = await query<BucketRow>(
    `SELECT location, sku_id,
            CASE
              WHEN (expiry_date - $1::date) <= 30 THEN 'd0_30'
              WHEN (expiry_date - $1::date) <= 60 THEN 'd31_60'
              WHEN (expiry_date - $1::date) <= 90 THEN 'd61_90'
              ELSE 'd90plus'
            END AS bucket,
            SUM(qty_units)::text AS units,
            COALESCE(SUM(qty_units * unit_cost_inr), 0)::text AS value_inr
     FROM inventory_batches
     WHERE as_of_date = $1::date
     GROUP BY location, sku_id, bucket`,
    [snapshot],
  );
  return result.rows.map((row) => ({
    location: row.location,
    skuId: row.sku_id,
    bucket: row.bucket as AgingBucket,
    units: Number(row.units),
    valueInr: Number(row.value_inr),
  }));
}

interface StatusRow {
  status: string;
  batches: string;
  units: string;
  value_inr: string;
}

export async function fetchStatusDistribution(snapshot: string): Promise<InventoryStatusRow[]> {
  const result = await query<StatusRow>(
    `SELECT status, COUNT(*)::text AS batches,
            COALESCE(SUM(qty_units), 0)::text AS units,
            COALESCE(SUM(qty_units * unit_cost_inr), 0)::text AS value_inr
     FROM inventory_batches
     WHERE as_of_date = $1::date
     GROUP BY status ORDER BY status`,
    [snapshot],
  );
  return result.rows.map((row) => ({
    status: row.status,
    batches: Number(row.batches),
    units: Number(row.units),
    valueInr: Number(row.value_inr),
  }));
}
