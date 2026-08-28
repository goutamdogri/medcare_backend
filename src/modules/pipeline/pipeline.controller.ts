import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { logger } from '../../config/logger.js';
import { mlClient } from '../../shared/ml-client.js';
import { PipelineStateRepository } from './pipeline-state.repository.js';
import { PipelineService } from './pipeline.service.js';
import {
  advanceDayBodySchema,
  pipelineStatusParamsSchema,
  retrainBodySchema,
  retryBodySchema,
  rolloverBodySchema,
} from './pipeline.schemas.js';

const state = new PipelineStateRepository();
const pipeline = new PipelineService(state);

/**
 * Advance the simulated clock by one day, save it in `pipeline_state`, then ask
 * the ML sidecar to run the whole chain for the new date. The backend never
 * writes the forecast [OUTPUT] tables — the sidecar does that directly.
 */
export const postAdvanceDayHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { days } = advanceDayBodySchema.parse(req.body ?? {});

    const result = await pipeline.advanceDay(days);

    if (result.runId == null) {
      // The clock advanced but the sidecar could not be reached. Reply 202 so the
      // frontend can still surface the new date and let the user retry.
      logger.warn(
        { from: result.from, to: result.to },
        'advance-day: sidecar not triggered (unreachable)',
      );
    }

    res.status(202).json({
      advanced: result.advanced,
      from: result.from,
      to: result.to,
      runId: result.runId,
      sidecarTriggered: result.runId != null,
    });
  },
);

/**
 * Retry the whole chain for a selected date. First removes all generated data
 * of the previous run for that date (by the backend), then re-executes and saves
 * it as normal by asking the sidecar to run the chain for that exact date.
 * The simulated clock is NOT advanced by a retry.
 */
export const postRetryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { date } = retryBodySchema.parse(req.body ?? {});

  const result = await pipeline.retryDate(date);

  res.status(202).json({
    asOf: result.asOf,
    purged: result.purged,
    runId: result.runId,
    sidecarTriggered: result.runId != null,
  });
});

export const postRolloverHandler = asyncHandler(async (req: Request, res: Response) => {
  rolloverBodySchema.parse(req.body ?? {});

  // Idempotency guard: skip if forecasts already cover simulated_today.
  await state.getSimulatedToday();

  const result = (await mlClient.post('/run/daily', {
    triggered_by: 'api',
  })) as { runId?: string };

  res.status(202).json({ runId: result.runId ?? null });
});

export const postRetrainHandler = asyncHandler(async (req: Request, res: Response) => {
  retrainBodySchema.parse(req.body ?? {});
  const result = await mlClient.post('/run/retrain', { triggered_by: 'api' });
  res.status(202).json(result);
});

export const getPipelineStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const { runId } = pipelineStatusParamsSchema.parse(req.params);
  const result = await pipeline.getRunStatus(runId);
  res.json(result);
});

export const getPipelineStateHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pipeline.getSimulatedToday();
  res.json(result);
});

export const getPipelineRunsHandler = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number.parseInt(String(req.query.limit ?? '10'), 10);
  const result = await pipeline.listRuns(Number.isFinite(limit) ? limit : 10);
  res.json({ runs: result });
});

export const postRolloverCompleteHandler = asyncHandler(async (req: Request, _res: Response) => {
  const body = req.body ?? {};
  logger.info(
    `[pipeline] rollover complete: as_of=${body.as_of}, status=${body.status}, duration=${body.duration_seconds}s`,
  );
  _res.json({ ok: true });
});

export const postRetrainCompleteHandler = asyncHandler(async (req: Request, _res: Response) => {
  const body = req.body ?? {};
  logger.info(
    `[pipeline] retrain complete: as_of=${body.as_of}, status=${body.status}, duration=${body.duration_seconds}s`,
  );
  _res.json({ ok: true });
});
