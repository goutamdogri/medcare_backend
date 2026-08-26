import { Router } from 'express';
import {
  getDailyCurvesHandler,
  getKpiHandler,
  getWriteoffCumulativeHandler,
} from './kpi.controller.js';

export const kpiRouter = Router();

kpiRouter.get('/', getKpiHandler);
kpiRouter.get('/daily-curves', getDailyCurvesHandler);
kpiRouter.get('/writeoff-cumulative', getWriteoffCumulativeHandler);
