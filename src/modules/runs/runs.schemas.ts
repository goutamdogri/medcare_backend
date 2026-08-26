import { z } from 'zod';
import { pageEnvelopeSchema } from '../../shared/pagination/pagination.js';

/**
 * `limit` is accepted as a convenience alias for `size` (spec §4.14 shows
 * `?limit=10`). When both are sent, `size` wins.
 */
export const runsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(0).default(0),
    // No default here so an explicit `?limit=` can act as the page size.
    size: z.coerce.number().int().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const runItemSchema = z.object({
  id: z.number().int(),
  asOfDate: z.string(),
  previousAsOfDate: z.string().nullable(),
  modelsUsed: z.array(z.string()),
  lgbmWeight: z.number().nullable(),
  chronosWeight: z.number().nullable(),
  /** Realized forecast error — null until actuals exist for the horizon. */
  wmape: z.number().nullable(),
  forecastRows: z.number().int().nullable(),
  status: z.string(),
  errorMessage: z.string().nullable(),
  durationSeconds: z.number().int().nullable(),
  triggeredBy: z.string(),
  createdAt: z.string().datetime(),
});

export const runsResponseSchema = pageEnvelopeSchema(runItemSchema);

export type RunsQuery = z.infer<typeof runsQuerySchema>;
export type RunItem = z.infer<typeof runItemSchema>;
