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

export const pipelineStatusParamsSchema = z.object({
  runId: z.string().trim().min(1).max(100),
});

export type RolloverBody = z.infer<typeof rolloverBodySchema>;
