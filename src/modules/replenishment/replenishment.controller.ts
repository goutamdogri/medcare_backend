import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';
import { replenishmentQuerySchema, skuCoverageParamsSchema } from './replenishment.schemas.js';
import {
  getReplenishmentOrders,
  getReplenishmentSummary,
  getSkuCoverage,
} from './replenishment.service.js';

export const getReplenishmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = replenishmentQuerySchema.parse(req.query);
  res.json(await getReplenishmentOrders(query));
});

export const getReplenishmentSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { asOf } = asOfQuerySchema.parse(req.query);
  res.json(await getReplenishmentSummary(asOf));
});

export const getSkuCoverageHandler = asyncHandler(async (req: Request, res: Response) => {
  const params = skuCoverageParamsSchema.parse(req.params);
  const { asOf } = asOfQuerySchema.parse(req.query);
  res.json(await getSkuCoverage(asOf, params));
});
