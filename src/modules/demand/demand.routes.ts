import { Router } from 'express';
import { getDemandHistoryHandler, getFluHandler } from './demand.controller.js';

export const demandRouter = Router();
export const fluRouter = Router();

demandRouter.get('/history', getDemandHistoryHandler);
fluRouter.get('/', getFluHandler);
