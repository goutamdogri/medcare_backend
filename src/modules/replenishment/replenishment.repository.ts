import { query } from '../../config/database.js';
import type {
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
