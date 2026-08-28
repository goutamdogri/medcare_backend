import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { standardErrors } from '../../docs/components.js';
import {
  advanceDayBodySchema,
  retryBodySchema,
  rolloverBodySchema,
} from './pipeline.schemas.js';

export function registerPipelineDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/advance-day',
    tags: ['Pipeline'],
    summary: 'Advance simulated date and trigger the daily forecast chain',
    description:
      'The backend advances pipeline_state.simulated_today by `days`, then asks the ML sidecar ' +
      'to run the full chain (forecast → replenishment → transfers → simulation → alerts) for the ' +
      'new date. The sidecar reads the simulated date and writes the generated [OUTPUT] rows ' +
      'directly to the DB — it never advances pipeline_state. ' +
      'Returns 202 immediately with the new date and a runId for status polling.',
    request: {
      body: {
        content: { 'application/json': { schema: advanceDayBodySchema } },
        required: false,
      },
    },
    responses: {
      202: {
        description: 'Clock advanced and chain triggered (or sidecar unreachable)',
        content: {
          'application/json': {
            schema: z.object({
              advanced: z.literal(true),
              from: z.string(),
              to: z.string(),
              runId: z.string().nullable(),
              sidecarTriggered: z.boolean(),
            }),
          },
        },
      },
      400: standardErrors['400'],
      500: standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/retry',
    tags: ['Pipeline'],
    summary: 'Retry the whole chain for a selected date',
    description:
      'First removes all generated [OUTPUT] rows of the previous run for `date` (wiped by the ' +
      'backend), then re-executes and saves them as normal by asking the sidecar to run the chain ' +
      'for that exact date. The simulated clock is NOT advanced by a retry.',
    request: {
      body: {
        content: { 'application/json': { schema: retryBodySchema } },
        required: true,
      },
    },
    responses: {
      202: {
        description: 'Previous output purged and chain re-triggered',
        content: {
          'application/json': {
            schema: z.object({
              asOf: z.string(),
              purged: z.record(z.string(), z.number()),
              runId: z.string().nullable(),
              sidecarTriggered: z.boolean(),
            }),
          },
        },
      },
      400: standardErrors['400'],
      500: standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/pipeline/state',
    tags: ['Pipeline'],
    summary: 'Read the current simulated date',
    responses: {
      200: {
        description: 'Current simulated clock',
        content: {
          'application/json': {
            schema: z.object({ simulatedToday: z.string() }),
          },
        },
      },
      500: standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/rollover',
    tags: ['Pipeline'],
    summary: 'Trigger a daily rollover run',
    description:
      'Proxies to the FastAPI sidecar (POST /run/daily) for the current simulated date. ' +
      'Returns 202 with a run_id; poll GET /api/pipeline/status/{runId} for completion.',
    request: {
      body: {
        content: { 'application/json': { schema: rolloverBodySchema } },
        required: false,
      },
    },
    responses: {
      202: {
        description: 'Run started',
        content: {
          'application/json': {
            schema: z.object({ runId: z.string().nullable() }),
          },
        },
      },
      400: standardErrors['400'],
      500: standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/retrain',
    tags: ['Pipeline'],
    summary: 'Trigger a monthly model retrain',
    description: 'Proxies to the FastAPI sidecar (POST /run/retrain). Returns 202 with a run_id.',
    request: { body: { content: { 'application/json': { schema: z.object({}) } }, required: false } },
    responses: {
      202: {
        description: 'Run started',
        content: {
          'application/json': {
            schema: z.object({
              runId: z.string().nullable(),
              status: z.string(),
              message: z.string(),
            }),
          },
        },
      },
      500: standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/pipeline/status/{runId}',
    tags: ['Pipeline'],
    summary: 'Poll status of an async pipeline run',
    description:
      'Proxies to the FastAPI sidecar (GET /run/{runId}/status). Run state is persisted in the ' +
      '`pipeline_run` table, so polling keeps working even if the sidecar restarts mid-run. ' +
      'Stale runs (orphaned by a crash) are reported as before.',
    parameters: [
      { name: 'runId', in: 'path', required: true, schema: { type: 'string' }, example: 'a1b2c3d4' },
    ],
    responses: {
      200: {
        description: 'Run status',
        content: {
          'application/json': {
            schema: z.object({
              runId: z.string(),
              status: z.string(),
              triggeredBy: z.string(),
              asOf: z.string().nullable(),
              startedAt: z.string(),
              finishedAt: z.string().nullable(),
              durationSeconds: z.number().nullable(),
              error: z.string().nullable(),
              stepsCompleted: z.array(z.string()),
            }),
          },
        },
      },
      404: standardErrors['404'],
    },
  });
}
