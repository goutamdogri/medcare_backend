import { z } from 'zod';

export const rolloverBodySchema = z
  .object({
    asOf: z
      .union([z.literal('auto'), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .default('auto'),
    horizon: z.coerce.number().int().min(1).max(42).default(42),
  })
  .strict();

export const retrainBodySchema = z.object({}).strict();

export const retryBodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  })
  .strict();

export const advanceDayBodySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(30).default(1),
  })
  .strict();

export const pipelineStatusParamsSchema = z.object({
  runId: z.string().trim().min(1).max(100),
});

export type RolloverBody = z.infer<typeof rolloverBodySchema>;
export type RetryBody = z.infer<typeof retryBodySchema>;
export type AdvanceDayBody = z.infer<typeof advanceDayBodySchema>;
