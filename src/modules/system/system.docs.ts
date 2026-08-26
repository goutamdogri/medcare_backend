import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ErrorResponseSchema, jsonOk, standardErrors } from '../../docs/components.js';
import { healthResponseSchema } from './system.schemas.js';

export function registerSystemDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['System'],
    summary: 'Liveness/readiness probe (process + database)',
    responses: {
      200: jsonOk('Service healthy', healthResponseSchema),
      503: {
        description: 'Database unreachable (standard error envelope)',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });
}
