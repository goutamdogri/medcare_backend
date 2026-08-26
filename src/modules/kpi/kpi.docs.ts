import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import {
  dailyCurvesResponseSchema,
  kpiResponseSchema,
  writeoffCumulativeResponseSchema,
} from './kpi.schemas.js';

export function registerKpiDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/kpi',
    tags: ['KPI'],
    summary: 'Headline KPI comparison between the proposed policy and status quo',
    parameters: [
      {
        name: 'asOf',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date' },
        description: 'Pipeline run date (yyyy-MM-dd). Defaults to the latest successful run.',
      },
    ],
    responses: {
      200: jsonOk('Policy comparison with computed improvement deltas', kpiResponseSchema),
      404: {
        ...standardErrors['404'],
        description: 'No run for the given asOf, or no KPI rows for it',
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/kpi/daily-curves',
    tags: ['KPI'],
    summary: 'Daily demand/fulfilment curves per policy, aggregated server-side',
    description:
      'Aggregates simulation_daily by date and policy — returns at most one point per day ' +
      '(42 points x 2 policies), never raw SKU×region rows.',
    parameters: [
      {
        name: 'asOf',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date' },
      },
    ],
    responses: {
      200: jsonOk('Per-policy daily series', dailyCurvesResponseSchema),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/kpi/writeoff-cumulative',
    tags: ['KPI'],
    summary: 'Cumulative expired value per policy per day ("₹ saved" area chart)',
    parameters: [
      {
        name: 'asOf',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date' },
      },
    ],
    responses: {
      200: jsonOk('Running total of expired value per policy', writeoffCumulativeResponseSchema),
      ...standardErrors,
    },
  });
}
