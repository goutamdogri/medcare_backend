import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';
import {
  getDailyCurves,
  getKpiSummary,
  getWriteoffCumulative,
} from './kpi.service.js';

export const getKpiHandler = asyncHandler(async (req: Request, res: Response) => {
  const { asOf } = asOfQuerySchema.parse(req.query);
  res.json(await getKpiSummary(asOf));
});

export const getDailyCurvesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { asOf } = asOfQuerySchema.parse(req.query);
  res.json(await getDailyCurves(asOf));
});

export const getWriteoffCumulativeHandler = asyncHandler(async (req: Request, res: Response) => {
  const { asOf } = asOfQuerySchema.parse(req.query);
  res.json(await getWriteoffCumulative(asOf));
});
