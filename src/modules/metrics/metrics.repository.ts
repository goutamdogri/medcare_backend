import { query } from '../../config/database.js';
import { mapKeysToCamel } from '../../shared/utils/mapping.js';
import type { MetricsQuery } from './metrics.schemas.js';

export async function getMetrics(params: MetricsQuery) {
  const asOfClause = params.asOf
    ? 'AND as_of_date = $1'
    : 'AND as_of_date = (SELECT MAX(as_of_date) FROM model_evaluation_metrics)';
  const modelClause = params.model ? 'AND model_name = $3' : '';

  const sql = `
    SELECT as_of_date, model_name, metric_name, metric_value, horizon_band, computed_at
    FROM model_evaluation_metrics
    WHERE 1=1 ${asOfClause} ${modelClause}
    ORDER BY model_name, metric_name, horizon_band NULLS LAST
  `;

  const args: unknown[] = [];
  if (params.asOf) args.push(params.asOf);
  if (params.model) args.push(params.model);

  const { rows } = await query(sql, args);
  return rows.map((row) => mapKeysToCamel(row));
}
