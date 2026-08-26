import { z } from 'zod';

export const skuSummarySchema = z.object({
  skuId: z.string(),
  brandName: z.string(),
  atcCode: z.string(),
  manufacturer: z.string(),
  regulatoryClass: z.string(),
  nlemListed: z.boolean(),
  criticality: z.string(),
  unitCostInr: z.number().int(),
  shelfLifeDays: z.number().int(),
});

export const regionSummarySchema = z.object({
  locationId: z.string(),
  name: z.string(),
  type: z.string(),
  capacityUnits: z.number().int(),
  city: z.string().nullable(),
  state: z.string().nullable(),
});

export const latestRunSchema = z.object({
  ranAt: z.string().datetime().nullable(),
  status: z.string().nullable(),
  modelsUsed: z.array(z.string()),
  lgbmWeight: z.number().nullable(),
  chronosWeight: z.number().nullable(),
  wmape: z.number().nullable(),
  durationSeconds: z.number().int().nullable(),
});

export const metaResponseSchema = z.object({
  asOf: z.string().nullable(),
  latestRun: latestRunSchema.nullable(),
  skus: z.array(skuSummarySchema),
  regions: z.array(regionSummarySchema),
});

export type SkuSummary = z.infer<typeof skuSummarySchema>;
export type RegionSummary = z.infer<typeof regionSummarySchema>;
export type LatestRun = z.infer<typeof latestRunSchema>;
export type MetaResponse = z.infer<typeof metaResponseSchema>;
