import { Router } from 'express';
import {
  getLanesHandler,
  getLocationsHandler,
  getSkusHandler,
} from './master.controller.js';

export const masterRouter = Router();

masterRouter.get('/skus', getSkusHandler);
masterRouter.get('/locations', getLocationsHandler);
masterRouter.get('/lanes', getLanesHandler);
