import { resolveAsOf } from '../../shared/asof/asof.js';
import { ApiError } from '../../shared/errors/api-errors.js';
import { round } from '../../shared/utils/mapping.js';
import type {
  DailyCurvesResponse,
  KpiImprovement,
  KpiPolicyBlock,
  KpiResponse,
  WriteoffCumulativeResponse,
} from './kpi.schemas.js';
import {
  fetchDailyCurves,
  fetchKpis,
  fetchWriteoffCumulative,
} from './kpi.repository.js';

function computeImprovement(
  proposed: KpiPolicyBlock,
  statusQuo: KpiPolicyBlock,
): KpiImprovement {
  return {
    fillRatePctDelta: round(proposed.fillRatePct - statusQuo.fillRatePct, 2),
    criticalFillRatePctDelta: round(
      proposed.criticalFillRatePct - statusQuo.criticalFillRatePct,
      2,
    ),
    stockoutUnitReductionPct:
      statusQuo.stockoutUnits > 0
        ? round(((statusQuo.stockoutUnits - proposed.stockoutUnits) / statusQuo.stockoutUnits) * 100, 1)
        : 0,
    writeoffSavingInr: Math.round(statusQuo.writeoffValueInr - proposed.writeoffValueInr),
  };
}

export async function getKpiSummary(asOfRequested?: string): Promise<KpiResponse> {
  const asOf = await resolveAsOf(asOfRequested);
  const kpis = await fetchKpis(asOf);
  if (!kpis.proposed || !kpis.statusQuo) {
    throw ApiError.notFound(
      `No KPI summary available for asOf=${asOf}`,
      'KPI_NOT_FOUND',
    );
  }
  return {
    asOf,
    proposed: kpis.proposed,
    statusQuo: kpis.statusQuo,
    improvement: computeImprovement(kpis.proposed, kpis.statusQuo),
  };
}

export async function getDailyCurves(asOfRequested?: string): Promise<DailyCurvesResponse> {
  const asOf = await resolveAsOf(asOfRequested);
  const series = await fetchDailyCurves(asOf);
  return { asOf, series };
}

export async function getWriteoffCumulative(
  asOfRequested?: string,
): Promise<WriteoffCumulativeResponse> {
  const asOf = await resolveAsOf(asOfRequested);
  const series = await fetchWriteoffCumulative(asOf);
  return { asOf, series };
}
