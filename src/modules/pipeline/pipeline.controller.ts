import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-errors.js';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { env } from '../../config/env.js';
import { query } from '../../config/database.js';
import {
  pipelineStatusParamsSchema,
  retrainBodySchema,
  rolloverBodySchema,
} from './pipeline.schemas.js';

const SIDECAR = env.ML_SIDECAR_URL;

async function sidecarPost(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${SIDECAR}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw ApiError.serviceUnavailable(`ML sidecar error (${res.status}): ${text}`);
  }
  return res.json();
}

async function sidecarGet(path: string) {
  const res = await fetch(`${SIDECAR}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw ApiError.serviceUnavailable(`ML sidecar error (${res.status}): ${text}`);
  }
  return res.json();
}

export const postRolloverHandler = asyncHandler(async (req: Request, res: Response) => {
  rolloverBodySchema.parse(req.body ?? {});

  console.log(req.body);

  // Idempotency guard: skip if forecasts already cover simulated_today
  const stateRow = await query<{ simulated_today: string }>(
    'SELECT simulated_today::text FROM pipeline_state WHERE id = 1',
  );

  const simulatedToday = stateRow.rows[0]?.simulated_today;

  console.log('simulatedToday', simulatedToday);

  if (!simulatedToday) {
    throw ApiError.serviceUnavailable('pipeline_state table is empty — run seed_staging.py first');
  }

  const fcRow = await query<{ max_as_of: string | null }>(
    'SELECT MAX(as_of_date)::text AS max_as_of FROM forecasts_final',
  );
  const maxAsOf = fcRow.rows[0]?.max_as_of;

  console.log('maxAsOf', maxAsOf);

  const cutoffDate = new Date(simulatedToday);
  cutoffDate.setDate(cutoffDate.getDate() - 1);

  if (maxAsOf && new Date(maxAsOf).toDateString() === cutoffDate.toDateString()) {
    res.json({
      skipped: true,
      reason: `forecasts already up to date (max_as_of=${maxAsOf}, simulated_today=${simulatedToday})`,
      simulated_today: simulatedToday,
    });
    return;
  }

  const result = await sidecarPost('/run/daily', {
    triggered_by: 'api',
  });
  res.status(202).json(result);
});

export const postRetrainHandler = asyncHandler(async (req: Request, res: Response) => {
  retrainBodySchema.parse(req.body ?? {});
  const result = await sidecarPost('/run/retrain', { triggered_by: 'api' });
  res.status(202).json(result);
});

export const getPipelineStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const { runId } = pipelineStatusParamsSchema.parse(req.params);
  const result = await sidecarGet(`/run/${runId}/status`);
  res.json(result);
});

export const postAdvanceDayHandler = asyncHandler(async (_req: Request, res: Response) => {
  // 1. Read current simulated_today
  const stateRow = await query<{ simulated_today: string }>(
    'SELECT simulated_today::text FROM pipeline_state WHERE id = 1',
  );
  const current = stateRow.rows[0]?.simulated_today;
  if (!current) {
    throw ApiError.serviceUnavailable('pipeline_state table is empty — run seed_staging.py first');
  }

  // 2. Advance by 1 day
  await query(
    "UPDATE pipeline_state SET simulated_today = simulated_today + INTERVAL '1 day', updated_at = CURRENT_TIMESTAMP WHERE id = 1",
  );

  const newState = await query<{ simulated_today: string }>(
    'SELECT simulated_today::text FROM pipeline_state WHERE id = 1',
  );
  const next = newState.rows[0]?.simulated_today;
  if (!next) {
    throw ApiError.serviceUnavailable('pipeline_state update failed');
  }

  // 3. Idempotency guard — check if forecasts already cover the new date
  const fcRow = await query<{ max_as_of: string | null }>(
    'SELECT MAX(as_of_date)::text AS max_as_of FROM forecasts_final',
  );
  const maxAsOf = fcRow.rows[0]?.max_as_of;

  if (maxAsOf && maxAsOf >= next) {
    res.json({
      advanced: true,
      skipped: true,
      from: current,
      to: next,
      reason: `forecasts already up to date (max_as_of=${maxAsOf})`,
    });
    return;
  }

  // 4. Trigger ML sidecar rollover
  const result = await sidecarPost('/run/daily', { triggered_by: 'api' });

  res.status(202).json({
    advanced: true,
    skipped: false,
    from: current,
    to: next,
    sidecar: result,
  });
});

export const postRolloverCompleteHandler = asyncHandler(async (req: Request, _res: Response) => {
  // Callback from ML sidecar after daily rollover completes
  const body = req.body ?? {};
  console.log(
    `[pipeline] rollover complete: as_of=${body.as_of}, status=${body.status}, duration=${body.duration_seconds}s`,
  );
  _res.json({ ok: true });
});

export const postRetrainCompleteHandler = asyncHandler(async (req: Request, _res: Response) => {
  // Callback from ML sidecar after monthly retrain completes
  const body = req.body ?? {};
  console.log(
    `[pipeline] retrain complete: as_of=${body.as_of}, status=${body.status}, duration=${body.duration_seconds}s`,
  );
  _res.json({ ok: true });
});
