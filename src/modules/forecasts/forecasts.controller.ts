import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { forecastQuerySchema } from './forecasts.schemas.js';
import { getForecasts } from './forecasts.service.js';

export const getForecastsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = forecastQuerySchema.parse(req.query);
  res.json(await getForecasts(query));
});
