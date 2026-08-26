import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { standardErrors } from '../../docs/components.js';

const metricsQuerySchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  model: z.string().optional(),
});

const metricsResponseSchema = z.object({
  as_of_date: z.string().nullable(),
  models: z.record(z.string(), z.record(z.string(), z.number().nullable())),
  by_horizon: z.record(
    z.string(),
    z.record(z.string(), z.record(z.string(), z.number().nullable())),
  ),
});

export function registerMetricsDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/model/metrics',
    tags: ['Model'],
    summary: 'Model evaluation metrics (WMAPE, MAE, RMSE, MAPE, R²)',
    description:
      'Returns accuracy metrics per model (ensemble, lgbm, chronos, nhits, tft), ' +
      'optionally broken down by horizon band (1-7, 8-14, 15-21, 22-42).',
    request: { query: metricsQuerySchema },
    responses: {
      200: {
        description: 'Metrics summary',
        content: { 'application/json': { schema: metricsResponseSchema } },
      },
      400: standardErrors['400'],
    },
  });
}
