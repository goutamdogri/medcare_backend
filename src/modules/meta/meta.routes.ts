import { Router } from 'express';
import { getMetaHandler } from './meta.controller.js';

export const metaRouter = Router();

metaRouter.get('/', getMetaHandler);
