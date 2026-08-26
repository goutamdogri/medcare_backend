import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { digestQuerySchema } from './digest.schemas.js';
import { getDigest } from './digest.service.js';

export const getDigestHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = digestQuerySchema.parse(req.query);
  res.json(await getDigest(query.asOf));
});
