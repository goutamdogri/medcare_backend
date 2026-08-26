import { Router } from 'express';
import { getDigestHandler } from './digest.controller.js';

export const digestRouter = Router();

digestRouter.get('/', getDigestHandler);
