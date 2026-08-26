import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import {
  acknowledgeBodySchema,
  acknowledgeResponseSchema,
  alertsResponseSchema,
} from './alerts.schemas.js';

export function registerAlertsDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/alerts',
    tags: ['Alerts'],
    summary: 'Escalation center feed for one run',
    description:
      'Alerts are ordered RED first. `facts` is a typed JSON object whose keys vary by alert ' +
      'type (e.g. daysOfSupply, leadTimeDays, recommendedOrderUnits).',
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      {
        name: 'severity',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['RED', 'AMBER'] },
      },
      {
        name: 'type',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['shortage_risk', 'expiry_writeoff_risk', 'demand_surge_detected'],
        },
      },
      {
        name: 'unackOnly',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
        description: 'Only return alerts that have not been acknowledged yet.',
      },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
    ],
    responses: {
      200: jsonOk('Paginated alerts', alertsResponseSchema),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/alerts/{id}/acknowledge',
    tags: ['Alerts'],
    summary: 'Acknowledge an alert (the only write endpoint in v1)',
    request: {
      body: {
        content: { 'application/json': { schema: acknowledgeBodySchema } },
        description: 'Identifies who acknowledged the alert (audit trail).',
        required: true,
      },
    },
    responses: {
      200: jsonOk('The updated alert with acknowledgement fields set', acknowledgeResponseSchema),
      404: {
        ...standardErrors['404'],
        description: 'No alert with the given id',
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });
}
