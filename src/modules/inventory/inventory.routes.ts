import { Router } from 'express';
import { getInventoryAgingHandler } from './inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.get('/aging', getInventoryAgingHandler);
