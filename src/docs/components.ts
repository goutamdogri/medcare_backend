/**
 * Shared OpenAPI registry + reusable component schemas.
 * Endpoint documentation lives beside each feature module (`<module>.docs.ts`)
 * and registers itself here, keeping validation schemas as the single source
 * of truth for both runtime checks and generated docs.
 */
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

/** Standard error envelope returned by every failing request. */
export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    status: z.number().int().openapi({ example: 404 }),
    error: z.string().openapi({ example: 'RUN_NOT_FOUND' }),
    message: z.string().optional(),
    details: z.unknown().optional(),
    path: z.string().openapi({ example: '/api/kpi' }),
    requestId: z.string().uuid().optional(),
    timestamp: z.string().datetime().openapi({ example: '2026-08-23T17:41:57.000Z' }),
  }),
);

/** Helper for declaring JSON responses with a body schema. */
export function jsonOk(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: { 'application/json': { schema } },
  };
}

/** Standard error responses shared by all endpoints. */
export const standardErrors = {
  '400': {
    description: 'Validation failed for query/path/body parameters',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  '404': {
    description: 'Requested resource or run not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  '500': {
    description: 'Unexpected server error (sanitized envelope)',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;
