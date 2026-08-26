import type { Request, Response } from 'express';
import { getMeta } from './meta.service.js';
import { asyncHandler } from '../../shared/http/async-handler.js';

export const getMetaHandler = asyncHandler(async (_req: Request, res: Response) => {
  const meta = await getMeta();
  res.json(meta);
});
