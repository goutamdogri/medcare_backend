import { z } from 'zod';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const agingBucketEnum = z.enum(['d0_30', 'd31_60', 'd61_90', 'd90plus']);

export const agingQuerySchema = asOfQuerySchema.strict();

export const agingRowSchema = z.object({
  location: z.string(),
  skuId: z.string(),
  bucket: agingBucketEnum,
  units: z.number().int(),
  valueInr: z.number().int(),
});

export const bucketTotalsSchema = z.object({
  units: z.number().int(),
  valueInr: z.number().int(),
});

export const locationAgingSchema = z.object({
  location: z.string(),
  buckets: z.object({
    d0_30: bucketTotalsSchema,
    d31_60: bucketTotalsSchema,
    d61_90: bucketTotalsSchema,
    d90plus: bucketTotalsSchema,
  }),
  totalUnits: z.number().int(),
  totalValueInr: z.number().int(),
});

export const inventoryStatusRowSchema = z.object({
  status: z.string(),
  batches: z.number().int(),
  units: z.number().int(),
  valueInr: z.number().int(),
});

export const agingResponseSchema = z.object({
  /** Resolved pipeline-run date (per API convention). */
  asOf: z.string(),
  /** Snapshot date actually used — the newest batch snapshot ≤ asOf. */
  snapshotDate: z.string(),
  buckets: z.array(agingRowSchema),
  byLocation: z.array(locationAgingSchema),
  statusDistribution: z.array(inventoryStatusRowSchema),
});

export type AgingBucket = z.infer<typeof agingBucketEnum>;
export type AgingQuery = z.infer<typeof agingQuerySchema>;
export type AgingRow = z.infer<typeof agingRowSchema>;
export type BucketTotals = z.infer<typeof bucketTotalsSchema>;
export type LocationAging = z.infer<typeof locationAgingSchema>;
export type InventoryStatusRow = z.infer<typeof inventoryStatusRowSchema>;
export type AgingResponse = z.infer<typeof agingResponseSchema>;
