import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { jsonOk, standardErrors } from '../../docs/components.js';
import {
  masterLaneSchema,
  masterLocationSchema,
  masterSkuSchema,
} from './master.schemas.js';

export function registerMasterDocs(registry: OpenAPIRegistry): void {
  const cacheNote = 'Responses are cached for 1 hour (memory + `Cache-Control: public, max-age=3600`).';

  registry.registerPath({
    method: 'get',
    path: '/api/master/skus',
    tags: ['Master'],
    summary: 'Full SKU master dump (dropdowns, labels, joins)',
    description: cacheNote,
    responses: {
      200: jsonOk('All SKUs ordered by skuId', z.array(masterSkuSchema)),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/master/locations',
    tags: ['Master'],
    summary: 'Full location master dump (DCs and warehouses)',
    description: cacheNote,
    responses: {
      200: jsonOk('All locations ordered by locationId', z.array(masterLocationSchema)),
      ...standardErrors,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/master/lanes',
    tags: ['Master'],
    summary: 'Full lane dump (supplier→DC, DC→WH with lead times)',
    description: cacheNote,
    responses: {
      200: jsonOk('All lanes', z.array(masterLaneSchema)),
      ...standardErrors,
    },
  });
}
