import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { transfersQuerySchema, writeoffsQuerySchema } from './allocation.schemas.js';
import { getTransfers, getWriteoffs } from './allocation.service.js';

export const getTransfersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = transfersQuerySchema.parse(req.query);
  res.json(await getTransfers(query));
});

export const getWriteoffsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = writeoffsQuerySchema.parse(req.query);
  res.json(await getWriteoffs(query));
});
