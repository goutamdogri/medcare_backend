import { Router } from 'express';
import {
  getPipelineRunsHandler,
  getPipelineStateHandler,
  getPipelineStatusHandler,
  postAdvanceDayHandler,
  postRetrainHandler,
  postRetryHandler,
  postRolloverHandler,
  postRolloverCompleteHandler,
  postRetrainCompleteHandler,
} from './pipeline.controller.js';

export const pipelineRouter = Router();

pipelineRouter.post('/advance-day', postAdvanceDayHandler);
pipelineRouter.post('/retry', postRetryHandler);
pipelineRouter.post('/rollover', postRolloverHandler);
pipelineRouter.post('/retrain', postRetrainHandler);
pipelineRouter.get('/state', getPipelineStateHandler);
pipelineRouter.get('/runs', getPipelineRunsHandler);
pipelineRouter.get('/status/:runId', getPipelineStatusHandler);
pipelineRouter.post('/rollover-complete', postRolloverCompleteHandler);
pipelineRouter.post('/retrain-complete', postRetrainCompleteHandler);
