import { query } from '../../config/database.js';
import type {
  InboundTransfer,
  ReplenishmentCoverage,
  ReplenishmentFilters,
  ReplenishmentItem,
  SortKey,
  SortDirection,
} from './replenishment.schemas.js';
import { toNumRounded } from '../../shared/utils/mapping.js';

interface ReplenishmentRow {
  sku_id: string;
  region: string;
  criticality: string;
  lead_time_days: number;
  service_level: string;
  mu_daily: string;
  sigma_daily: string;
  safety_stock: number;
  target_position: number;
  on_hand: number;
  order_qty: number;
  order_value_inr: number;
  days_of_supply_on_hand: string | null;
  status: string;
  total_count: string;
}

function mapRow(row: ReplenishmentRow): ReplenishmentItem {
  return {
    skuId: row.sku_id,
    region: row.region,
    criticality: row.criticality,
    leadTimeDays: Number(row.lead_time_days),
    serviceLevel: toNumRounded(row.service_level, 2)!,
    muDaily: toNumRounded(row.mu_daily, 2)!,
    sigmaDaily: toNumRounded(row.sigma_daily, 2)!,
    safetyStock: Number(row.safety_stock),
    targetPosition: Number(row.target_position),
    onHand: Number(row.on_hand),
    orderQty: Number(row.order_qty),
    orderValueInr: Number(row.order_value_inr),
    daysOfSupplyOnHand: toNumRounded(row.days_of_supply_on_hand, 2),
    status: row.status,
  };
}

/** Whitelisted ORDER BY fragments — user input never reaches SQL text. */
const ORDER_BY: Record<SortKey, Record<SortDirection, string>> = {
  dos: {
    asc: 'days_of_supply_on_hand ASC NULLS LAST',
    desc: 'days_of_supply_on_hand DESC NULLS LAST',
  },
  orderValueInr: {
    asc: 'order_value_inr ASC',
    desc: 'order_value_inr DESC',
  },
  orderQty: {
    asc: 'order_qty ASC',
    desc: 'order_qty DESC',
  },
};

export async function listReplenishment(
  asOf: string,
  filters: ReplenishmentFilters,
  sortKey: SortKey | undefined,
  direction: SortDirection | undefined,
  page: number,
  size: number,
): Promise<{ content: ReplenishmentItem[]; totalElements: number }> {
  const clauses = ['as_of_date = $1'];
  const params: unknown[] = [asOf];

  if (filters.status !== undefined) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.criticality !== undefined) {
    params.push(filters.criticality);
    clauses.push(`criticality = $${params.length}`);
  }
  if (filters.region !== undefined) {
    params.push(filters.region);
    clauses.push(`region = $${params.length}`);
  }

  const orderBy = sortKey
    ? ORDER_BY[sortKey][direction ?? (sortKey === 'dos' ? 'asc' : 'desc')]
    // Default per spec §4.7: critical first, then lowest days-of-supply.
    : `CASE criticality
         WHEN 'critical' THEN 0 WHEN 'high' THEN 1
         WHEN 'standard' THEN 2 ELSE 3 END ASC,
       days_of_supply_on_hand ASC NULLS LAST`;

  const whereClause = clauses.join(' AND ');
  const whereParams = [...params];
  const dataParams = [...params, size, page * size];
  const result = await query<ReplenishmentRow>(
    `SELECT sku_id, region, criticality, lead_time_days, service_level, mu_daily,
            sigma_daily, safety_stock, target_position, on_hand, order_qty,
            order_value_inr, days_of_supply_on_hand, status,
            COUNT(*) OVER() AS total_count
     FROM replenishment_orders
     WHERE ${whereClause}
     ORDER BY ${orderBy}, sku_id, region
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  let totalElements = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  if (totalElements === 0 && result.rows.length === 0) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM replenishment_orders WHERE ${whereClause}`,
      whereParams,
    );
    totalElements = Number(countResult.rows[0]?.count ?? 0);
  }

  return {
    content: result.rows.map(mapRow),
    totalElements,
  };
}

interface StatusCountRow {
  status: string;
  count: string;
}

interface CriticalitySummaryRow {
  criticality: string;
  count: string;
  total_order_qty: string;
  total_order_value_inr: string;
}

export interface ReplenishmentSummaryData {
  byStatus: { ok: number; low: number; stockout_risk: number };
  totalOrderValueInr: number;
  byCriticality: Array<{
    criticality: string;
    count: number;
    totalOrderQty: number;
    totalOrderValueInr: number;
  }>;
}

export async function fetchSummary(asOf: string): Promise<ReplenishmentSummaryData> {
  const [statusRows, criticalityRows, totalRows] = await Promise.all([
    query<StatusCountRow>(
      `SELECT status, COUNT(*)::text AS count FROM replenishment_orders
       WHERE as_of_date = $1 GROUP BY status`,
      [asOf],
    ),
    query<CriticalitySummaryRow>(
      `SELECT criticality, COUNT(*)::text AS count,
              COALESCE(SUM(order_qty), 0)::text AS total_order_qty,
              COALESCE(SUM(order_value_inr), 0)::text AS total_order_value_inr
       FROM replenishment_orders WHERE as_of_date = $1 GROUP BY criticality`,
      [asOf],
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(order_value_inr), 0)::text AS total FROM replenishment_orders
       WHERE as_of_date = $1`,
      [asOf],
    ),
  ]);

  const byStatus = { ok: 0, low: 0, stockout_risk: 0 };
  for (const row of statusRows.rows) {
    if (row.status === 'ok') byStatus.ok = Number(row.count);
    else if (row.status === 'low') byStatus.low = Number(row.count);
    else if (row.status === 'stockout_risk') byStatus.stockout_risk = Number(row.count);
  }

  return {
    byStatus,
    totalOrderValueInr: Number(totalRows.rows[0]?.total ?? 0),
    byCriticality: criticalityRows.rows.map((row) => ({
      criticality: row.criticality,
      count: Number(row.count),
      totalOrderQty: Number(row.total_order_qty),
      totalOrderValueInr: Number(row.total_order_value_inr),
    })),
  };
}

interface InboundTransferRow {
  id: string;
  batch_id: string | null;
  from_location: string;
  qty_units: string;
  transfer_lead_days: string;
  days_to_expiry: string | null;
  reason: string;
  carrier: string | null;
}

interface OrderRow {
  order_qty: string;
}

/**
 * Reconcile a single SKU × region order with its inbound transfer plan.
 *
 * Inbound transfers are those whose `to_location` equals the order's region —
 * they are already in transit into this stocking point, so the units that still
 * need to be purchased from the supplier is the order qty minus whatever the
 * transfer plan covers (never negative).
 */
export async function fetchSkuCoverage(
  asOf: string,
  skuId: string,
  region: string,
): Promise<ReplenishmentCoverage> {
  const [orderResult, transferResult] = await Promise.all([
    query<OrderRow>(
      `SELECT COALESCE((SELECT order_qty::text FROM replenishment_orders
         WHERE as_of_date = $1 AND sku_id = $2 AND region = $3
         ORDER BY created_at DESC LIMIT 1), '0') AS order_qty`,
      [asOf, skuId, region],
    ),
    query<InboundTransferRow>(
      `SELECT t.id::text AS id, t.batch_id, t.from_location,
              t.qty_units::text AS qty_units,
              t.transfer_lead_days::text AS transfer_lead_days,
              t.days_to_expiry::text AS days_to_expiry, t.reason, l.carrier
       FROM transfer_plan t
       LEFT JOIN lanes l
         ON l.from_location = t.from_location
        AND l.to_location = t.to_location
        AND l.mode = 'transfer'
       WHERE t.as_of_date = $1 AND t.sku_id = $2 AND t.to_location = $3
       ORDER BY t.days_to_expiry ASC NULLS LAST, t.qty_units DESC, t.id`,
      [asOf, skuId, region],
    ),
  ]);

  const orderQty = Number(orderResult.rows[0]?.order_qty ?? 0);
  const transfers: InboundTransfer[] = transferResult.rows.map((row) => ({
    id: Number(row.id),
    batchId: row.batch_id,
    fromLocation: row.from_location,
    qtyUnits: Number(row.qty_units),
    transferLeadDays: Number(row.transfer_lead_days),
    daysToExpiry: row.days_to_expiry === null ? null : Number(row.days_to_expiry),
    reason: row.reason,
    carrier: row.carrier,
  }));
  const inboundUnits = transfers.reduce((acc, t) => acc + t.qtyUnits, 0);
  const netToOrder = Math.max(0, orderQty - inboundUnits);
  const coveragePct = orderQty > 0 ? Math.min(100, (inboundUnits / orderQty) * 100) : null;

  return {
    asOf,
    skuId,
    region,
    orderQty,
    inboundUnits,
    netToOrder,
    coveragePct: coveragePct === null ? null : Math.round(coveragePct * 10) / 10,
    inboundTransfers: transfers,
  };
}
