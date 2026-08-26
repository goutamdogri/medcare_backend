import { Router } from 'express';
import { getMetricsHandler } from './metrics.controller.js';

export const metricsRouter = Router();
metricsRouter.get('/', getMetricsHandler);
