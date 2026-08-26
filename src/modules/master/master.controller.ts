import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { getLanes, getLocations, getSkus } from './master.service.js';

const MASTER_CACHE_HEADER = 'public, max-age=3600'; // matches MASTER_CACHE_TTL_MS

function withCacheHeaders(res: Response): void {
  res.set('Cache-Control', MASTER_CACHE_HEADER);
}

export const getSkusHandler = asyncHandler(async (_req: Request, res: Response) => {
  withCacheHeaders(res);
  res.json(await getSkus());
});

export const getLocationsHandler = asyncHandler(async (_req: Request, res: Response) => {
  withCacheHeaders(res);
  res.json(await getLocations());
});

export const getLanesHandler = asyncHandler(async (_req: Request, res: Response) => {
  withCacheHeaders(res);
  res.json(await getLanes());
});
