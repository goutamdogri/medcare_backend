import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { runsResponseSchema } from './runs.schemas.js';

export function registerRunsDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/runs',
    tags: ['Runs'],
    summary: 'Pipeline audit trail (newest runs first)',
    description:
      'Standard pagination applies; `?limit=10` is accepted as an alias for `size` ' +
      '(explicit `size` wins when both are provided).',
    parameters: [
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 }, description: 'Alias for size.' },
    ],
    responses: {
      200: jsonOk('Paginated run log entries', runsResponseSchema),
      ...standardErrors,
    },
  });
}
