import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  env: z.string(),
  uptimeSeconds: z.number().int(),
  timestamp: z.string().datetime(),
});
