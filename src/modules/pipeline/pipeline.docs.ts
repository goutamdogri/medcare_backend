import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { standardErrors } from '../../docs/components.js';
import { rolloverBodySchema } from './pipeline.schemas.js';

export function registerPipelineDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/advance-day',
    tags: ['Pipeline'],
    summary: 'Advance simulated date and trigger daily rollover',
    description:
      'Advances pipeline_state.simulated_today by 1 day, then triggers the ML sidecar daily roll. ' +
      'Returns 202 with run_id, or 200 with skipped=true if forecasts are already current.',
    responses: {
      202: {
        description: 'Day advanced and rollover triggered',
        content: {
          'application/json': {
            schema: z.object({
              advanced: z.literal(true),
              skipped: z.literal(false),
              from: z.string(),
              to: z.string(),
              sidecar: z.object({ run_id: z.string(), status: z.string(), message: z.string() }),
            }),
          },
        },
      },
      200: {
        description: 'Day advanced but rollover skipped (already up to date)',
        content: {
          'application/json': {
            schema: z.object({
              advanced: z.literal(true),
              skipped: z.literal(true),
              from: z.string(),
              to: z.string(),
              reason: z.string(),
            }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/pipeline/rollover',
    tags: ['Pipeline'],
    summary: 'Trigger a daily rollover run',
    description:
      'Proxies to the FastAPI sidecar (POST /run/daily). Returns 202 with a run_id; ' +
      'poll GET /api/pipeline/status/{runId} for completion.',
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
            schema: z.object({
              run_id: z.string(),
              status: z.string(),
              message: z.string(),
            }),
          },
        },
      },
      409: standardErrors['400'],
      400: standardErrors['400'],
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
              run_id: z.string(),
              status: z.string(),
              message: z.string(),
            }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/pipeline/status/{runId}',
    tags: ['Pipeline'],
    summary: 'Poll status of an async pipeline run',
    description: 'Proxies to the FastAPI sidecar (GET /run/{runId}/status).',
    parameters: [
      { name: 'runId', in: 'path', required: true, schema: { type: 'string' }, example: 'a1b2c3d4' },
    ],
    responses: {
      200: {
        description: 'Run status',
        content: {
          'application/json': {
            schema: z.object({
              run_id: z.string(),
              status: z.string(),
              triggered_by: z.string(),
              started_at: z.string(),
              finished_at: z.string().nullable(),
              duration_seconds: z.number().nullable(),
              error: z.string().nullable(),
              steps_completed: z.array(z.string()),
            }),
          },
        },
      },
      404: standardErrors['404'],
    },
  });
}
