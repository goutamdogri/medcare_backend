import { z } from 'zod';

export const metricsQuerySchema = z
  .object({
    asOf: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    model: z.string().trim().optional(),
  })
  .strict();

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
