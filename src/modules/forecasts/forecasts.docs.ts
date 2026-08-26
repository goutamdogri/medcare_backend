import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { forecastsResponseSchema } from './forecasts.schemas.js';

export function registerForecastDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/forecasts',
    tags: ['Forecasts'],
    summary: 'Paginated probabilistic forecasts for one run',
    description:
      'Powers the forecast-band chart and the sensing table. `horizonMax` implements the ' +
      "frontend's forecast-window slider by filtering `horizon <= N`.",
    parameters: [
      { name: 'asOf', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
      { name: 'skuId', in: 'query', required: false, schema: { type: 'string' }, example: 'M01AB-01' },
      { name: 'region', in: 'query', required: false, schema: { type: 'string' }, example: 'DC_DELHI' },
      { name: 'atcCode', in: 'query', required: false, schema: { type: 'string' }, example: 'M01AB' },
      {
        name: 'horizonMax',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 42, default: 42 },
        description: 'Only return horizons up to this many days ahead.',
      },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'size', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
    ],
    responses: {
      200: jsonOk('Paginated forecast rows with model mix metadata', forecastsResponseSchema),
      ...standardErrors,
    },
  });
}
