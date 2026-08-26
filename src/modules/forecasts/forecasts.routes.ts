import { Router } from 'express';
import { getForecastsHandler } from './forecasts.controller.js';

export const forecastsRouter = Router();

forecastsRouter.get('/', getForecastsHandler);
