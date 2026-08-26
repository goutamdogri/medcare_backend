import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { demandHistoryQuerySchema, fluQuerySchema } from './demand.schemas.js';
import { getDemandHistory, getFluSeries } from './demand.service.js';

export const getDemandHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = demandHistoryQuerySchema.parse(req.query);
  res.json(await getDemandHistory(query));
});

export const getFluHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = fluQuerySchema.parse(req.query);
  res.json(await getFluSeries(query));
});
