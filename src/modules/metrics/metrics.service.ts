import type { MetricsQuery } from './metrics.schemas.js';
import { getMetrics } from './metrics.repository.js';

export async function getMetricsSummary(params: MetricsQuery) {
  const rows = await getMetrics(params);

  const models: Record<string, Record<string, number | null>> = {};
  const byHorizon: Record<string, Record<string, Record<string, number | null>>> = {};

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const modelName = r.modelName as string;
    const metricName = r.metricName as string;
    const metricValue = r.metricValue as number | null;
    const horizonBand = r.horizonBand as string | null;

    if (!horizonBand) {
      if (!models[modelName]) models[modelName] = {};
      models[modelName][metricName] = metricValue;
    } else {
      if (!byHorizon[horizonBand]) byHorizon[horizonBand] = {};
      if (!byHorizon[horizonBand][modelName]) byHorizon[horizonBand][modelName] = {};
      byHorizon[horizonBand][modelName][metricName] = metricValue;
    }
  }

  return {
    as_of_date: (rows[0] as Record<string, unknown>)?.asOfDate ?? null,
    models,
    by_horizon: byHorizon,
  };
}
