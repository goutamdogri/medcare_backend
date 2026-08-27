/**
 * Assembles the OpenAPI 3.0 document from per-module registrations.
 * Served as JSON at /api/openapi.json and rendered by Swagger UI at /api-docs.
 */
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registry } from './components.js';
import { registerSystemDocs } from '../modules/system/system.docs.js';
import { registerMetaDocs } from '../modules/meta/meta.docs.js';
import { registerKpiDocs } from '../modules/kpi/kpi.docs.js';
import { registerForecastDocs } from '../modules/forecasts/forecasts.docs.js';
import { registerDemandDocs } from '../modules/demand/demand.docs.js';
import { registerReplenishmentDocs } from '../modules/replenishment/replenishment.docs.js';
import { registerAllocationDocs } from '../modules/allocation/allocation.docs.js';
import { registerInventoryDocs } from '../modules/inventory/inventory.docs.js';
import { registerAlertsDocs } from '../modules/alerts/alerts.docs.js';
import { registerDigestDocs } from '../modules/digest/digest.docs.js';
import { registerRunsDocs } from '../modules/runs/runs.docs.js';
import { registerMasterDocs } from '../modules/master/master.docs.js';
import { registerPipelineDocs } from '../modules/pipeline/pipeline.docs.js';
import { registerMetricsDocs } from '../modules/metrics/metrics.docs.js';
import { registerAuthDocs } from '../modules/auth/auth.docs.js';

const TAGS = [
  { name: 'System', description: 'Health probe used by CI and load balancers' },
  { name: 'Meta', description: 'Bootstrap payload: resolved run date, SKU master, regions, latest run info' },
  { name: 'KPI', description: 'Headline policy comparison and server-aggregated simulation curves' },
  { name: 'Forecasts', description: 'Probabilistic demand forecasts (ensemble output)' },
  { name: 'Demand', description: 'Actual sales history and flu-burden index' },
  { name: 'Replenishment', description: 'Computed reorder plan and order-book summary' },
  { name: 'Allocation', description: 'Transfer recommendations and residual write-off exposure' },
  { name: 'Inventory', description: 'Inventory batch aging buckets' },
  { name: 'Alerts', description: 'Escalation center — listing plus the acknowledge write endpoint' },
  { name: 'Digest', description: 'AI-generated daily escalation brief' },
  { name: 'Runs', description: 'Pipeline audit trail' },
  { name: 'Master', description: 'Static reference data dumps (cached)' },
  { name: 'Pipeline', description: 'ML pipeline trigger proxies — wired to FastAPI sidecar' },
  { name: 'Model', description: 'Model performance evaluation metrics' },
  { name: 'Auth', description: 'Email + password authentication and session management' },
] as const;

function registerAllPaths(registry: OpenAPIRegistry): void {
  registerSystemDocs(registry);
  registerMetaDocs(registry);
  registerKpiDocs(registry);
  registerForecastDocs(registry);
  registerDemandDocs(registry);
  registerReplenishmentDocs(registry);
  registerAllocationDocs(registry);
  registerInventoryDocs(registry);
  registerAlertsDocs(registry);
  registerDigestDocs(registry);
  registerRunsDocs(registry);
  registerMasterDocs(registry);
  registerPipelineDocs(registry);
  registerMetricsDocs(registry);
  registerAuthDocs(registry);
}

let cachedDoc: Record<string, unknown> | null = null;

/** Builds the document once; the spec is static for the lifetime of a build. */
export function getOpenApiDocument(): Record<string, unknown> {
  if (!cachedDoc) {
    registerAllPaths(registry);
    const gen = new OpenApiGeneratorV3(registry.definitions);
    cachedDoc = gen.generateDocument({
      openapi: '3.0.3',
      info: {
        version: '1.0.0',
        title: 'MedCare Supply Chain Control Tower API',
        description:
          'Read-mostly REST API over the `medcare` PostgreSQL database. The ML pipeline writes all ' +
          'results on a daily schedule; this API serves consistent `asOf` snapshots to the React SPA. ' +
          '\n\n**Conventions**\n' +
          '- Every list endpoint paginates with `page` (0-based) and `size` (default 50, max 500) ' +
          'and returns `{ content, page, size, totalElements, totalPages }`.\n' +
          '- Run-scoped endpoints accept an optional `asOf=yyyy-MM-dd`; the default is the latest ' +
          'successful pipeline run. Unknown dates return `404 RUN_NOT_FOUND`.\n' +
          '- Dates serialize as `yyyy-MM-dd`, timestamps as ISO-8601 UTC.\n' +
          '- All errors use one envelope: `{ status, error, message?, details?, path, requestId, timestamp }`.',
      },
      servers: [{ url: '/' }],
      security: [],
      tags: TAGS.map((t) => ({ ...t })),
    }) as unknown as Record<string, unknown>;
  }
  return cachedDoc;
}
