import { Router } from 'express';
import { acknowledgeAlertHandler, getAlertsHandler } from './alerts.controller.js';

export const alertsRouter = Router();

alertsRouter.get('/', getAlertsHandler);
alertsRouter.patch('/:id/acknowledge', acknowledgeAlertHandler);
