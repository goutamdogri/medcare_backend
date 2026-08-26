import { Router } from 'express';
import {
  getReplenishmentHandler,
  getReplenishmentSummaryHandler,
} from './replenishment.controller.js';

export const replenishmentRouter = Router();

replenishmentRouter.get('/', getReplenishmentHandler);
replenishmentRouter.get('/summary', getReplenishmentSummaryHandler);
