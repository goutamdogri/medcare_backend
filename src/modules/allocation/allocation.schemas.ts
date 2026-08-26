import { z } from 'zod';
import { paginationQuerySchema, pageEnvelopeSchema } from '../../shared/pagination/pagination.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const transferReasonEnum = z.enum(['expiry_rescue', 'shortage_rescue']);

export const transfersQuerySchema = paginationQuerySchema
  .merge(asOfQuerySchema)
  .extend({
    reason: transferReasonEnum.optional(),
  })
  .strict();

export const transferItemSchema = z.object({
  id: z.number().int(),
  batchId: z.string().nullable(),
  skuId: z.string(),
  fromLocation: z.string(),
  toLocation: z.string(),
  qtyUnits: z.number().int(),
  expiryDate: z.string().nullable(),
  daysToExpiry: z.number().int().nullable(),
  transferLeadDays: z.number().int(),
  valueSavedInr: z.number().int(),
  reason: z.string(),
  /** Null for shortage rescues — source had no meaningful days-of-supply. */
  srcDaysOfSupplyBefore: z.number().nullable(),
  carrier: z.string().nullable(),
});

export const laneCountSchema = z.object({
  lane: z.string(),
  count: z.number().int(),
  unitsMoved: z.number().int(),
});

export const transfersSummarySchema = z.object({
  totalTransfers: z.number().int(),
  totalUnitsMoved: z.number().int(),
  totalValueSavedInr: z.number().int(),
  countByReason: z.object({
    expiry_rescue: z.number().int(),
    shortage_rescue: z.number().int(),
  }),
  byLane: z.array(laneCountSchema),
});

export const transfersResponseSchema = pageEnvelopeSchema(transferItemSchema).extend({
  asOf: z.string(),
  summary: transfersSummarySchema,
});

export const writeoffsQuerySchema = paginationQuerySchema.merge(asOfQuerySchema).strict();

export const writeoffItemSchema = z.object({
  id: z.number().int(),
  batchId: z.string(),
  skuId: z.string(),
  location: z.string(),
  qtyUnits: z.number().int(),
  leftover: z.number().int(),
  residualWriteoffUnits: z.number().int(),
  unitCostInr: z.number().int(),
  residualValueInr: z.number().int(),
  expiryDate: z.string(),
  daysToExpiry: z.number().int(),
});

export const writeoffsTotalsSchema = z.object({
  batchesAtRisk: z.number().int(),
  totalResidualUnits: z.number().int(),
  totalResidualValueInr: z.number().int(),
});

export const writeoffsResponseSchema = pageEnvelopeSchema(writeoffItemSchema).extend({
  asOf: z.string(),
  totals: writeoffsTotalsSchema,
});

export type TransfersQuery = z.infer<typeof transfersQuerySchema>;
export type TransferItem = z.infer<typeof transferItemSchema>;
export type TransfersResponse = z.infer<typeof transfersResponseSchema>;
export type WriteoffsQuery = z.infer<typeof writeoffsQuerySchema>;
export type WriteoffItem = z.infer<typeof writeoffItemSchema>;
export type WriteoffsResponse = z.infer<typeof writeoffsResponseSchema>;
