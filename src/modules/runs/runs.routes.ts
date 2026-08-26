import { Router } from 'express';
import { getRunsHandler } from './runs.controller.js';

export const runsRouter = Router();

runsRouter.get('/', getRunsHandler);
