import { z } from 'zod';
import { paginationQuerySchema, pageEnvelopeSchema } from '../../shared/pagination/pagination.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const alertSeverityEnum = z.enum(['RED', 'AMBER']);
export const alertTypeEnum = z.enum([
  'shortage_risk',
  'expiry_writeoff_risk',
  'demand_surge_detected',
]);

export const alertsQuerySchema = paginationQuerySchema
  .merge(asOfQuerySchema)
  .extend({
    severity: alertSeverityEnum.optional(),
    type: alertTypeEnum.optional(),
    /** String enum (not coerce) so `?unackOnly=false` cannot flip to `true`. */
    unackOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict();

/** Alert-specific metrics emitted by alerts.py — keys vary by alert type. */
const alertFactsSchema = z.record(z.unknown());

export const alertItemSchema = z.object({
  id: z.number().int(),
  severity: z.string(),
  type: z.string(),
  skuId: z.string(),
  region: z.string(),
  facts: alertFactsSchema,
  action: z.string().nullable(),
  acknowledged: z.boolean(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const alertsResponseSchema = pageEnvelopeSchema(alertItemSchema).extend({
  asOf: z.string(),
});

export const acknowledgeBodySchema = z
  .object({
    user: z
      .string({ required_error: 'user is required' })
      .trim()
      .min(1, 'user must not be empty')
      .max(100, 'user must be at most 100 characters'),
  })
  .strict();

export const acknowledgeResponseSchema = alertItemSchema;

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;
export type AlertItem = z.infer<typeof alertItemSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type AcknowledgeBody = z.infer<typeof acknowledgeBodySchema>;
