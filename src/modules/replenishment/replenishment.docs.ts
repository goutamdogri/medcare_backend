import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import {
  replenishmentCoverageSchema,
  replenishmentResponseSchema,
  replenishmentSummarySchema,
} from './replenishment.schemas.js';

export function registerReplenishmentDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/replenishment',
    tags: ['Replenishment'],
    summary: 'Paginated reorder plan for one run',
    description:
      'Default sort is criticality first (`critical` first), then lowest days-of-supply. ' +
      '`sort=dos` orders by days_of_supply_on_hand with NULLs (stockouts) last.',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['ok', 'low', 'stockout_risk'] },
      },
      {
        name: 'criticality',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['critical', 'high', 'standard', 'low'] },
      },
      { name: 'region', in: 'query', required: false, schema: { type: 'string' }, example: 'WH_INDORE' },
      {
        name: 'sort',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['dos', 'orderValueInr', 'orderQty'] },
      },
      { name: 'direction', in: 'query', required: false, schema: { type: 'string', enum: ['asc', 'desc'] } },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
    ],
    responses: {
      200: jsonOk('Paginated order book', replenishmentResponseSchema),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/replenishment/summary',
    tags: ['Replenishment'],
    summary: 'Counts and value roll-ups by status and criticality',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
      200: jsonOk('Order-book aggregates', replenishmentSummarySchema),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/replenishment/{skuId}/{region}/coverage',
    tags: ['Replenishment'],
    summary: 'Reconcile an order with its inbound transfer plan',
    description:
      'For one SKU × region, returns the order quantity alongside the units already arriving ' +
      'via the transfer plan (inbound transfers into `region`). `netToOrder` is `orderQty − ' +
      'inboundUnits` floored at 0 — the amount still to be bought from the supplier. ' +
      'Powers the "recommended transfer plan / remaining to order" audit shown under the order-book ' +
      'calculation drawer.',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'skuId', in: 'path', required: true, schema: { type: 'string' }, example: 'N02BE-01' },
      { name: 'region', in: 'path', required: true, schema: { type: 'string' }, example: 'WH_INDORE' },
    ],
    responses: {
      200: jsonOk('Order-to-transfer reconciliation', replenishmentCoverageSchema),
      ...standardErrors,
    },
  });
}
