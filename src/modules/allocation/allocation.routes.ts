import { Router } from 'express';
import { getTransfersHandler, getWriteoffsHandler } from './allocation.controller.js';

export const transfersRouter = Router();
export const writeoffsRouter = Router();

transfersRouter.get('/', getTransfersHandler);
writeoffsRouter.get('/', getWriteoffsHandler);
