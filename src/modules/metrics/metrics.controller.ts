import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { metricsQuerySchema } from './metrics.schemas.js';
import { getMetricsSummary } from './metrics.service.js';

export const getMetricsHandler = asyncHandler(async (req: Request, res: Response) => {
  const params = metricsQuerySchema.parse(req.query);
  const result = await getMetricsSummary(params);
  res.json(result);
});
