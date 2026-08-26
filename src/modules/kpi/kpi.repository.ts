import { query } from '../../config/database.js';
import type {
  DailyCurvePoint,
  KpiPolicyBlock,
  WriteoffCumulativePoint,
} from './kpi.schemas.js';
import { toNum, toNumRounded } from '../../shared/utils/mapping.js';

interface KpiRow {
  policy: string;
  fill_rate_pct: string;
  critical_fill_rate_pct: string;
  stockout_units: number;
  critical_stockout_sitedays: number;
  writeoff_value_inr: string;
}

function mapKpiBlock(row: KpiRow): KpiPolicyBlock {
  return {
    fillRatePct: toNumRounded(row.fill_rate_pct, 2)!,
    criticalFillRatePct: toNumRounded(row.critical_fill_rate_pct, 2)!,
    stockoutUnits: Number(row.stockout_units),
    criticalStockoutSitedays: Number(row.critical_stockout_sitedays),
    writeoffValueInr: Number(row.writeoff_value_inr),
  };
}

export async function fetchKpis(asOf: string): Promise<Record<'proposed' | 'statusQuo', KpiPolicyBlock | null>> {
  const result = await query<KpiRow>(
    `SELECT policy, fill_rate_pct, critical_fill_rate_pct, stockout_units,
            critical_stockout_sitedays, writeoff_value_inr
     FROM kpi_summary WHERE as_of_date = $1`,
    [asOf],
  );
  const proposed = result.rows.find((r) => r.policy === 'proposed');
  const statusQuo = result.rows.find((r) => r.policy === 'status_quo');
  return {
    proposed: proposed ? mapKpiBlock(proposed) : null,
    statusQuo: statusQuo ? mapKpiBlock(statusQuo) : null,
  };
}

interface CurveRow {
  date: string;
  policy: string;
  demand: string | null;
  fulfilled: string | null;
  unfulfilled: string | null;
  expired_value_inr: string | null;
  avg_ending_inventory: string | null;
}

function mapCurvePoint(row: CurveRow): DailyCurvePoint {
  return {
    date: row.date,
    demand: toNumRounded(row.demand, 2) ?? 0,
    fulfilled: toNumRounded(row.fulfilled, 2) ?? 0,
    unfulfilled: toNumRounded(row.unfulfilled, 2) ?? 0,
    expiredValueInr: toNumRounded(row.expired_value_inr, 2) ?? 0,
    avgEndingInventory: toNumRounded(row.avg_ending_inventory, 2) ?? 0,
  };
}

/** Server-side aggregation over simulation_daily — raw rows never leave the DB. */
export async function fetchDailyCurves(
  asOf: string,
): Promise<{ proposed: DailyCurvePoint[]; statusQuo: DailyCurvePoint[] }> {
  const result = await query<CurveRow>(
    `SELECT (date)::text AS date, policy,
            SUM(demand) AS demand,
            SUM(fulfilled) AS fulfilled,
            SUM(unfulfilled) AS unfulfilled,
            SUM(expired_value_inr) AS expired_value_inr,
            AVG(ending_inventory) AS avg_ending_inventory
     FROM simulation_daily
     WHERE as_of_date = $1
     GROUP BY date, policy
     ORDER BY date`,
    [asOf],
  );
  const series: Record<string, DailyCurvePoint[]> = { proposed: [], status_quo: [] };
  for (const row of result.rows) {
    (series[row.policy] ??= []).push(mapCurvePoint(row));
  }
  return { proposed: series['proposed']!, statusQuo: series['status_quo']! };
}

interface CumulativeRow {
  date: string;
  policy: string;
  cumulative: string | null;
}

export async function fetchWriteoffCumulative(
  asOf: string,
): Promise<{ proposed: WriteoffCumulativePoint[]; statusQuo: WriteoffCumulativePoint[] }> {
  const result = await query<CumulativeRow>(
    `SELECT (date)::text AS date, policy,
            SUM(SUM(expired_value_inr)) OVER (PARTITION BY policy ORDER BY date)
              AS cumulative
     FROM simulation_daily
     WHERE as_of_date = $1
     GROUP BY date, policy
     ORDER BY date`,
    [asOf],
  );
  const series: Record<string, WriteoffCumulativePoint[]> = { proposed: [], status_quo: [] };
  for (const row of result.rows) {
    (series[row.policy] ??= []).push({
      date: row.date,
      cumulativeExpiredValueInr: toNum(row.cumulative) ?? 0,
    });
  }
  return { proposed: series['proposed']!, statusQuo: series['status_quo']! };
}
