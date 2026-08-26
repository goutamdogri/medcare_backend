import { z } from 'zod';
import { paginationQuerySchema, pageEnvelopeSchema } from '../../shared/pagination/pagination.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const replenishmentStatusEnum = z.enum(['ok', 'low', 'stockout_risk']);
export const criticalityEnum = z.enum(['critical', 'high', 'standard', 'low']);

export const replenishmentQuerySchema = paginationQuerySchema
  .merge(asOfQuerySchema)
  .extend({
    status: replenishmentStatusEnum.optional(),
    criticality: criticalityEnum.optional(),
    region: z.string().trim().min(1).max(30).optional(),
    /** `dos` sorts by days_of_supply_on_hand (NULL last). */
    sort: z.enum(['dos', 'orderValueInr', 'orderQty']).optional(),
    direction: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const replenishmentItemSchema = z.object({
  skuId: z.string(),
  region: z.string(),
  criticality: z.string(),
  leadTimeDays: z.number().int(),
  serviceLevel: z.number(),
  muDaily: z.number(),
  sigmaDaily: z.number(),
  safetyStock: z.number().int(),
  targetPosition: z.number().int(),
  onHand: z.number().int(),
  orderQty: z.number().int(),
  orderValueInr: z.number().int(),
  daysOfSupplyOnHand: z.number().nullable(),
  status: z.string(),
});

export const replenishmentResponseSchema = pageEnvelopeSchema(replenishmentItemSchema).extend({
  asOf: z.string(),
});

export const criticalitySummaryRowSchema = z.object({
  criticality: z.string(),
  count: z.number().int(),
  totalOrderQty: z.number().int(),
  totalOrderValueInr: z.number().int(),
});

export const replenishmentSummarySchema = z.object({
  asOf: z.string(),
  byStatus: z.object({
    ok: z.number().int(),
    low: z.number().int(),
    stockout_risk: z.number().int(),
  }),
  totalOrderValueInr: z.number().int(),
  byCriticality: z.array(criticalitySummaryRowSchema),
});

export type ReplenishmentQuery = z.infer<typeof replenishmentQuerySchema>;
export type ReplenishmentItem = z.infer<typeof replenishmentItemSchema>;
export type ReplenishmentResponse = z.infer<typeof replenishmentResponseSchema>;
export type ReplenishmentSummary = z.infer<typeof replenishmentSummarySchema>;

export type SortKey = 'dos' | 'orderValueInr' | 'orderQty';
export type SortDirection = 'asc' | 'desc';

export interface ReplenishmentFilters {
  status?: z.infer<typeof replenishmentStatusEnum>;
  criticality?: z.infer<typeof criticalityEnum>;
  region?: string;
}
