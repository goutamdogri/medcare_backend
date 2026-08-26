import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { agingResponseSchema } from './inventory.schemas.js';

export function registerInventoryDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/inventory/aging',
    tags: ['Inventory'],
    summary: 'Inventory batch aging buckets for the newest snapshot ≤ asOf',
    description:
      'Buckets batches by days-to-expiry (`d0_30`, `d31_60`, `d61_90`, `d90plus`). ' +
      '`buckets` holds the per-location×SKU rows (heatmap), `byLocation` the rolled-up ' +
      'stacked-bar shape, and `statusDistribution` the healthy/watch/near_expiry_risk/stockout split.',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
      200: jsonOk('Aging analysis', agingResponseSchema),
      404: {
        ...standardErrors['404'],
        description: 'No run for asOf, or no inventory snapshot on/before it',
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });
}
