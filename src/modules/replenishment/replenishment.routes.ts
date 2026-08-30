import { Router } from 'express';
import {
  getReplenishmentHandler,
  getReplenishmentSummaryHandler,
  getSkuCoverageHandler,
} from './replenishment.controller.js';

export const replenishmentRouter = Router();

replenishmentRouter.get('/', getReplenishmentHandler);
replenishmentRouter.get('/summary', getReplenishmentSummaryHandler);
replenishmentRouter.get('/:skuId/:region/coverage', getSkuCoverageHandler);
