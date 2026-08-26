import compression from 'compression';
import type { Express } from 'express';
import express from 'express';
import { pinoHttp } from 'pino-http';import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getOpenApiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler.js';
import { metaRouter } from './modules/meta/meta.routes.js';
import { kpiRouter } from './modules/kpi/kpi.routes.js';
import { forecastsRouter } from './modules/forecasts/forecasts.routes.js';
import { demandRouter, fluRouter } from './modules/demand/demand.routes.js';
import { replenishmentRouter } from './modules/replenishment/replenishment.routes.js';
import { transfersRouter, writeoffsRouter } from './modules/allocation/allocation.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { alertsRouter } from './modules/alerts/alerts.routes.js';
import { digestRouter } from './modules/digest/digest.routes.js';
import { runsRouter } from './modules/runs/runs.routes.js';
import { masterRouter } from './modules/master/master.routes.js';
import { pipelineRouter } from './modules/pipeline/pipeline.routes.js';
import { metricsRouter } from './modules/metrics/metrics.routes.js';
import { getHealthHandler } from './modules/system/system.controller.js';

/**
 * Express application factory. Kept separate from the bootstrap so tests can
 * drive the full middleware stack with supertest without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Request logging + request-id correlation for early error triage.
  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/health/',
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 86_400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/openapi.json', (_req, res) => {
    res.json(getOpenApiDocument());
  });

  api.use('/meta', metaRouter);
  api.use('/kpi', kpiRouter);
  api.use('/forecasts', forecastsRouter);
  api.use('/demand', demandRouter);
  api.use('/flu', fluRouter);
  api.use('/replenishment', replenishmentRouter);
  api.use('/transfers', transfersRouter);
  api.use('/writeoffs', writeoffsRouter);
  api.use('/inventory', inventoryRouter);
  api.use('/alerts', alertsRouter);
  api.use('/digest', digestRouter);
  api.use('/runs', runsRouter);
  api.use('/master', masterRouter);
  api.use('/pipeline', pipelineRouter);
  api.use('/model/metrics', metricsRouter);

  app.use('/api', api);

  app.get('/health', getHealthHandler);
  app.get('/', (_req, res) => res.redirect('/api-docs'));

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(getOpenApiDocument(), {
      customSiteTitle: 'MedCare Supply Chain Control Tower API',
      explorer: false,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
