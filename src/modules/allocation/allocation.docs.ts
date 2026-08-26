import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import {
  transfersResponseSchema,
  writeoffsResponseSchema,
} from './allocation.schemas.js';

export function registerAllocationDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/transfers',
    tags: ['Allocation'],
    summary: 'Stock-transfer recommendations (expiry rescue / shortage rescue)',
    description:
      'Per-batch transfer plan joined with lane carrier info when available. ' +
      'The embedded `summary` block powers the "saved vs residual" pairing with `/api/writeoffs`.',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      {
        name: 'reason',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['expiry_rescue', 'shortage_rescue'] },
      },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
    ],
    responses: {
      200: jsonOk('Paginated transfer plan with roll-up summary', transfersResponseSchema),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/writeoffs',
    tags: ['Allocation'],
    summary: 'Residual expiry write-off exposure after optimization',
    description:
      '`totals.totalResidualValueInr` is the residual financial exposure once the transfer ' +
      'plan has been applied.',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
    ],
    responses: {
      200: jsonOk('Paginated at-risk batches with totals', writeoffsResponseSchema),
      ...standardErrors,
    },
  });
}
