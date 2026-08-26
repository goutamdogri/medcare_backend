import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { demandPointSchema, fluPointSchema } from './demand.schemas.js';

export function registerDemandDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/demand/history',
    tags: ['Demand'],
    summary: 'Actual daily sales history',
    description:
      'Returns raw per-day rows when **both** `skuId` and `region` are supplied; otherwise ' +
      'totals are aggregated by date server-side. The window is capped at 400 days; missing ' +
      'bounds default to the newest available data.',
    parameters: [
      { name: 'skuId', in: 'query', required: false, schema: { type: 'string' }, example: 'M01AB-01' },
      { name: 'region', in: 'query', required: false, schema: { type: 'string' }, example: 'DC_MUMBAI' },
      { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
      200: jsonOk(
        'Series of `{ date, units }` points ordered by date',
        z.array(demandPointSchema),
      ),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/flu',
    tags: ['Demand'],
    summary: 'Influenza-like-illness (ILI) burden index',
    description: 'Overlay series for the sensing charts. Same 400-day range cap as demand history.',
    parameters: [
      { name: 'region', in: 'query', required: false, schema: { type: 'string' }, example: 'DC_MUMBAI' },
      { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
      200: jsonOk('Series of `{ date, region, indexValue }` points', z.array(fluPointSchema)),
      ...standardErrors,
    },
  });
}
