import { z } from 'zod';

export const kpiPolicyBlockSchema = z.object({
  fillRatePct: z.number(),
  criticalFillRatePct: z.number(),
  stockoutUnits: z.number().int(),
  criticalStockoutSitedays: z.number().int(),
  writeoffValueInr: z.number().int(),
});

export const kpiImprovementSchema = z.object({
  fillRatePctDelta: z.number(),
  criticalFillRatePctDelta: z.number(),
  stockoutUnitReductionPct: z.number(),
  writeoffSavingInr: z.number().int(),
});

export const kpiResponseSchema = z.object({
  asOf: z.string(),
  proposed: kpiPolicyBlockSchema,
  statusQuo: kpiPolicyBlockSchema,
  improvement: kpiImprovementSchema,
});

export const dailyCurvePointSchema = z.object({
  date: z.string(),
  demand: z.number(),
  fulfilled: z.number(),
  unfulfilled: z.number(),
  expiredValueInr: z.number(),
  avgEndingInventory: z.number(),
});

export const dailyCurvesResponseSchema = z.object({
  asOf: z.string(),
  series: z.object({
    proposed: z.array(dailyCurvePointSchema),
    statusQuo: z.array(dailyCurvePointSchema),
  }),
});

export const writeoffCumulativePointSchema = z.object({
  date: z.string(),
  cumulativeExpiredValueInr: z.number(),
});

export const writeoffCumulativeResponseSchema = z.object({
  asOf: z.string(),
  series: z.object({
    proposed: z.array(writeoffCumulativePointSchema),
    statusQuo: z.array(writeoffCumulativePointSchema),
  }),
});

export type KpiPolicyBlock = z.infer<typeof kpiPolicyBlockSchema>;
export type KpiImprovement = z.infer<typeof kpiImprovementSchema>;
export type KpiResponse = z.infer<typeof kpiResponseSchema>;
export type DailyCurvePoint = z.infer<typeof dailyCurvePointSchema>;
export type DailyCurvesResponse = z.infer<typeof dailyCurvesResponseSchema>;
export type WriteoffCumulativePoint = z.infer<typeof writeoffCumulativePointSchema>;
export type WriteoffCumulativeResponse = z.infer<typeof writeoffCumulativeResponseSchema>;
