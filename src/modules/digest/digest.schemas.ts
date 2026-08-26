import { z } from 'zod';
import { asOfQuerySchema } from '../../shared/asof/asof.js';

export const digestQuerySchema = asOfQuerySchema.strict();

export const digestResponseSchema = z.object({
  asOf: z.string(),
  reviewMode: z.string(),
  /** Empty array when the pipeline recorded no surge regions (NULL/blank). */
  surgeRegions: z.array(z.string()),
  redAlertCount: z.number().int(),
  digestText: z.string(),
  modelUsed: z.string().nullable(),
});

export type DigestQuery = z.infer<typeof digestQuerySchema>;
export type DigestResponse = z.infer<typeof digestResponseSchema>;
