import { query } from '../../config/database.js';
import type { TransferItem, WriteoffItem } from './allocation.schemas.js';

interface TransferRow {
  id: number;
  batch_id: string | null;
  sku_id: string;
  from_location: string;
  to_location: string;
  qty_units: number;
  expiry_date: string | null;
  days_to_expiry: number | null;
  transfer_lead_days: number;
  value_saved_inr: number;
  reason: string;
  src_days_of_supply_before: string | null;
  carrier: string | null;
  total_count: string;
}

function mapTransfer(row: TransferRow): TransferItem {
  return {
    id: Number(row.id),
    batchId: row.batch_id,
    skuId: row.sku_id,
    fromLocation: row.from_location,
    toLocation: row.to_location,
    qtyUnits: Number(row.qty_units),
    expiryDate: row.expiry_date,
    daysToExpiry: row.days_to_expiry === null ? null : Number(row.days_to_expiry),
    transferLeadDays: Number(row.transfer_lead_days),
    valueSavedInr: Number(row.value_saved_inr),
    reason: row.reason,
    srcDaysOfSupplyBefore:
      row.src_days_of_supply_before === null
        ? null
        : Number(row.src_days_of_supply_before),
    carrier: row.carrier,
  };
}

export async function listTransfers(
  asOf: string,
  reason: 'expiry_rescue' | 'shortage_rescue' | undefined,
  page: number,
  size: number,
): Promise<{ content: TransferItem[]; totalElements: number }> {
  const clauses = ['t.as_of_date = $1'];
  const params: unknown[] = [asOf];
  if (reason !== undefined) {
    params.push(reason);
    clauses.push(`t.reason = $${params.length}`);
  }
  const whereClause = clauses.join(' AND ');
  const whereParams = [...params];
  const dataParams = [...params, size, page * size];

  const result = await query<TransferRow>(
    `SELECT t.id, t.batch_id, t.sku_id, t.from_location, t.to_location,
            (t.expiry_date)::text AS expiry_date, t.days_to_expiry, t.qty_units,
            t.transfer_lead_days, t.value_saved_inr, t.reason,
            t.src_days_of_supply_before, l.carrier,
            COUNT(*) OVER() AS total_count
     FROM transfer_plan t
     LEFT JOIN lanes l
       ON l.from_location = t.from_location
      AND l.to_location = t.to_location
      AND l.mode = 'transfer'
     WHERE ${whereClause}
     ORDER BY t.days_to_expiry ASC NULLS LAST, t.sku_id, t.id
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  let totalElements = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  if (totalElements === 0 && result.rows.length === 0) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM transfer_plan t WHERE ${whereClause}`,
      whereParams,
    );
    totalElements = Number(countResult.rows[0]?.count ?? 0);
  }

  return {
    content: result.rows.map(mapTransfer),
    totalElements,
  };
}

export interface TransfersSummaryData {
  totalTransfers: number;
  totalUnitsMoved: number;
  totalValueSavedInr: number;
  countByReason: { expiry_rescue: number; shortage_rescue: number };
  byLane: Array<{ lane: string; count: number; unitsMoved: number }>;
}

interface TotalsRow {
  total_transfers: string;
  total_units: string;
  total_value: string;
}

interface ReasonRow {
  reason: string;
  count: string;
  units: string;
}

interface LaneRow {
  from_location: string;
  to_location: string;
  count: string;
  units: string;
}

export async function fetchTransfersSummary(
  asOf: string,
): Promise<TransfersSummaryData> {
  const [totalsRows, reasonRows, laneRows] = await Promise.all([
    query<TotalsRow>(
      `SELECT COUNT(*)::text AS total_transfers,
              COALESCE(SUM(qty_units), 0)::text AS total_units,
              COALESCE(SUM(value_saved_inr), 0)::text AS total_value
       FROM transfer_plan WHERE as_of_date = $1`,
      [asOf],
    ),
    query<ReasonRow>(
      `SELECT reason, COUNT(*)::text AS count, COALESCE(SUM(qty_units), 0)::text AS units
       FROM transfer_plan WHERE as_of_date = $1 GROUP BY reason`,
      [asOf],
    ),
    query<LaneRow>(
      `SELECT from_location, to_location, COUNT(*)::text AS count,
              COALESCE(SUM(qty_units), 0)::text AS units
       FROM transfer_plan WHERE as_of_date = $1
       GROUP BY from_location, to_location ORDER BY count DESC`,
      [asOf],
    ),
  ]);

  const totals = totalsRows.rows[0];
  const countByReason = { expiry_rescue: 0, shortage_rescue: 0 };
  for (const row of reasonRows.rows) {
    if (row.reason === 'expiry_rescue') countByReason.expiry_rescue = Number(row.count);
    else if (row.reason === 'shortage_rescue') countByReason.shortage_rescue = Number(row.count);
  }

  return {
    totalTransfers: Number(totals?.total_transfers ?? 0),
    totalUnitsMoved: Number(totals?.total_units ?? 0),
    totalValueSavedInr: Number(totals?.total_value ?? 0),
    countByReason,
    byLane: laneRows.rows.map((row) => ({
      lane: `${row.from_location} → ${row.to_location}`,
      count: Number(row.count),
      unitsMoved: Number(row.units),
    })),
  };
}

interface WriteoffRow {
  id: number;
  batch_id: string;
  sku_id: string;
  location: string;
  qty_units: number;
  leftover: number;
  residual_writeoff_units: number;
  unit_cost_inr: number;
  residual_value_inr: number;
  expiry_date: string;
  days_to_expiry: number;
  total_count: string;
}

function mapWriteoff(row: WriteoffRow): WriteoffItem {
  return {
    id: Number(row.id),
    batchId: row.batch_id,
    skuId: row.sku_id,
    location: row.location,
    qtyUnits: Number(row.qty_units),
    leftover: Number(row.leftover),
    residualWriteoffUnits: Number(row.residual_writeoff_units),
    unitCostInr: Number(row.unit_cost_inr),
    residualValueInr: Number(row.residual_value_inr),
    expiryDate: row.expiry_date,
    daysToExpiry: Number(row.days_to_expiry),
  };
}

export async function listWriteoffs(
  asOf: string,
  page: number,
  size: number,
): Promise<{
  content: WriteoffItem[];
  totalElements: number;
  totals: { batchesAtRisk: number; totalResidualUnits: number; totalResidualValueInr: number };
}> {
  const [pageResult, totalsResult] = await Promise.all([
    query<WriteoffRow>(
      `SELECT id, batch_id, sku_id, location, qty_units, leftover,
              residual_writeoff_units, unit_cost_inr, residual_value_inr,
              (expiry_date)::text AS expiry_date, days_to_expiry,
              COUNT(*) OVER() AS total_count
       FROM writeoff_risk
       WHERE as_of_date = $1
       ORDER BY residual_value_inr DESC, sku_id, id
       LIMIT $2 OFFSET $3`,
      [asOf, size, page * size],
    ),
    query<{ batches: string; units: string; value: string }>(
      `SELECT COUNT(*)::text AS batches,
              COALESCE(SUM(residual_writeoff_units), 0)::text AS units,
              COALESCE(SUM(residual_value_inr), 0)::text AS value
       FROM writeoff_risk WHERE as_of_date = $1`,
      [asOf],
    ),
  ]);

  const totals = totalsResult.rows[0];
  let totalElements = pageResult.rows[0] ? Number(pageResult.rows[0].total_count) : 0;
  if (totalElements === 0 && pageResult.rows.length === 0) {
    totalElements = Number(totals?.batches ?? 0);
  }
  return {
    content: pageResult.rows.map(mapWriteoff),
    totalElements,
    totals: {
      batchesAtRisk: Number(totals?.batches ?? 0),
      totalResidualUnits: Number(totals?.units ?? 0),
      totalResidualValueInr: Number(totals?.value ?? 0),
    },
  };
}
