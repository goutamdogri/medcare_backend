import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { metaResponseSchema } from './meta.schemas.js';

export function registerMetaDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/meta',
    tags: ['Meta'],
    summary: 'Bootstrap payload loaded once by the SPA on boot',
    description:
      'Returns the resolved `asOf` (latest successful pipeline run), the latest run metadata, ' +
      'the full SKU master and the location master in a single call.',
    responses: {
      200: jsonOk('Bootstrap payload', metaResponseSchema),
      ...standardErrors,
    },
  });
}
