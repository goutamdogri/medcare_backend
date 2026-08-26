import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { runsQuerySchema } from './runs.schemas.js';
import { getRuns } from './runs.service.js';

export const getRunsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = runsQuerySchema.parse(req.query);
  res.json(await getRuns(query));
});
