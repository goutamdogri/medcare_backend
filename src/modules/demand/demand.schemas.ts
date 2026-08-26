import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (yyyy-MM-dd)')
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'must be a real calendar date' });

export const demandHistoryQuerySchema = z
  .object({
    skuId: z.string().trim().min(1).max(20).optional(),
    region: z.string().trim().min(1).max(30).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const fluQuerySchema = z
  .object({
    region: z.string().trim().min(1).max(30).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict();

export const demandPointSchema = z.object({
  date: z.string(),
  units: z.number().int().min(0),
});

export const fluPointSchema = z.object({
  date: z.string(),
  region: z.string(),
  indexValue: z.number(),
});

/** Maximum span allowed between `from` and `to` (spec §4.5). */
export const MAX_RANGE_DAYS = 400;

export type DemandHistoryQuery = z.infer<typeof demandHistoryQuerySchema>;
export type DemandPoint = z.infer<typeof demandPointSchema>;
export type FluPoint = z.infer<typeof fluPointSchema>;
export type FluQuery = z.infer<typeof fluQuerySchema>;
