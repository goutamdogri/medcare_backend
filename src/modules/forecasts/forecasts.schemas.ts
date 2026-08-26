import { z } from 'zod';
import { paginationQuerySchema, pageEnvelopeSchema } from '../../shared/pagination/pagination.js';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const forecastQuerySchema = paginationQuerySchema
  .merge(asOfQuerySchema)
  .extend({
    skuId: z.string().trim().min(1).max(20).optional(),
    region: z.string().trim().min(1).max(30).optional(),
    atcCode: z.string().trim().min(1).max(10).optional(),
    horizonMax: z.coerce
      .number()
      .int('horizonMax must be an integer')
      .min(1, 'horizonMax must be between 1 and 42')
      .max(42, 'horizonMax must be between 1 and 42')
      .optional(),
  })
  .strict();

export const forecastItemSchema = z.object({
  skuId: z.string(),
  region: z.string(),
  atcCode: z.string(),
  forecastDate: z.string(),
  horizon: z.number().int().min(1),
  p10: z.number(),
  p50: z.number(),
  p90: z.number(),
  momentumU: z.number().nullable(),
  fluRatio: z.number().nullable(),
  senseAdjustment: z.number().nullable(),
});

export const modelMixSchema = z.object({
  lgbm: z.number().nullable(),
  chronos: z.number().nullable(),
});

export const forecastsResponseSchema = pageEnvelopeSchema(forecastItemSchema).extend({
  asOf: z.string(),
  modelMix: modelMixSchema,
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
export type ForecastItem = z.infer<typeof forecastItemSchema>;
export type ModelMix = z.infer<typeof modelMixSchema>;
export type ForecastsResponse = z.infer<typeof forecastsResponseSchema>;

export interface ForecastsFilters {
  skuId?: string;
  region?: string;
  atcCode?: string;
  horizonMax?: number;
}
