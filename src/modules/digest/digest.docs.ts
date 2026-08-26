import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { digestResponseSchema } from './digest.schemas.js';

export function registerDigestDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/digest',
    tags: ['Digest'],
    summary: 'AI-generated daily escalation brief for the CSCO',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
    ],
    responses: {
      200: jsonOk('Daily digest narrative', digestResponseSchema),
      404: {
        ...standardErrors['404'],
        description: 'No run for asOf, or no digest generated for it',
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });
}
