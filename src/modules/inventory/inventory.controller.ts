import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { agingQuerySchema } from './inventory.schemas.js';
import { getInventoryAging } from './inventory.service.js';

export const getInventoryAgingHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = agingQuerySchema.parse(req.query);
  res.json(await getInventoryAging(query.asOf));
});
