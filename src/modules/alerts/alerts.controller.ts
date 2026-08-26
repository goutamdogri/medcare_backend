import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { acknowledgeBodySchema, alertsQuerySchema } from './alerts.schemas.js';
import { acknowledge, getAlerts } from './alerts.service.js';

export const getAlertsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = alertsQuerySchema.parse(req.query);
  res.json(await getAlerts(query));
});

export const acknowledgeAlertHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = z.coerce
    .number()
    .int('alert id must be an integer')
    .positive('alert id must be positive')
    .parse(req.params.id);
  const body = acknowledgeBodySchema.parse(req.body);
  res.json(await acknowledge(id, body));
});
