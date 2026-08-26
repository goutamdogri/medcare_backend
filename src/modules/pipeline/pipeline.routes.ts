import { Router } from 'express';
import {
  getPipelineStatusHandler,
  postAdvanceDayHandler,
  postRetrainHandler,
  postRolloverHandler,
  postRolloverCompleteHandler,
  postRetrainCompleteHandler,
} from './pipeline.controller.js';

export const pipelineRouter = Router();

pipelineRouter.post('/advance-day', postAdvanceDayHandler);
pipelineRouter.post('/rollover', postRolloverHandler);
pipelineRouter.post('/retrain', postRetrainHandler);
pipelineRouter.get('/status/:runId', getPipelineStatusHandler);
pipelineRouter.post('/rollover-complete', postRolloverCompleteHandler);
pipelineRouter.post('/retrain-complete', postRetrainCompleteHandler);
