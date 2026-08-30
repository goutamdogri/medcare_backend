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

/**
 * Inbound-transfer line used to offset a recommended order. These are the
 * transfer-plan rows that deliver this SKU into the given region/location, so
 * the planner can see what is already covered by intra-network moves before
 * committing a fresh purchase from the supplier.
 */
export const inboundTransferSchema = z.object({
  id: z.number().int(),
  batchId: z.string().nullable(),
  fromLocation: z.string(),
  qtyUnits: z.number().int(),
  transferLeadDays: z.number().int(),
  daysToExpiry: z.number().int().nullable(),
  reason: z.string(),
  carrier: z.string().nullable(),
});

/** Params for a single SKU × region coverage lookup. */
export const skuCoverageParamsSchema = z.object({
  skuId: z.string().trim().min(1).max(20),
  region: z.string().trim().min(1).max(30),
});

/**
 * How the recommended order of a SKU at a region is reconciled with the
 * transfer plan: `inboundUnits` are units already arriving via transfers, so
 * `netToOrder` is what still needs to be bought from the supplier
 * (`orderQty − inboundUnits`, floored at 0).
 */
export const replenishmentCoverageSchema = z.object({
  asOf: z.string(),
  skuId: z.string(),
  region: z.string(),
  orderQty: z.number().int(),
  inboundUnits: z.number().int(),
  netToOrder: z.number().int(),
  /** Share of the order already covered by inbound transfers (0–100, null when no order). */
  coveragePct: z.number().nullable(),
  inboundTransfers: z.array(inboundTransferSchema),
});

export type ReplenishmentQuery = z.infer<typeof replenishmentQuerySchema>;
export type ReplenishmentItem = z.infer<typeof replenishmentItemSchema>;
export type ReplenishmentResponse = z.infer<typeof replenishmentResponseSchema>;
export type ReplenishmentSummary = z.infer<typeof replenishmentSummarySchema>;
export type SkuCoverageParams = z.infer<typeof skuCoverageParamsSchema>;
export type InboundTransfer = z.infer<typeof inboundTransferSchema>;
export type ReplenishmentCoverage = z.infer<typeof replenishmentCoverageSchema>;

export type SortKey = 'dos' | 'orderValueInr' | 'orderQty';
export type SortDirection = 'asc' | 'desc';

export interface ReplenishmentFilters {
  status?: z.infer<typeof replenishmentStatusEnum>;
  criticality?: z.infer<typeof criticalityEnum>;
  region?: string;
}
