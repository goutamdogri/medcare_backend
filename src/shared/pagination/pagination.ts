import { z } from 'zod';

/**
 * Shared pagination contract: `page` is 0-based, `size` defaults to 50 with a
 * hard ceiling of 500. Merge into endpoint-specific query schemas.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page must be an integer')
    .min(0, 'page must be >= 0')
    .default(0),
  size: z.coerce
    .number()
    .int('size must be an integer')
    .min(1, 'size must be >= 1')
    .max(500, 'size must be <= 500')
    .default(50),
});

export interface PageEnvelope<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Builds the standard list envelope from raw rows + total count. */
export function buildPage<T>(
  content: T[],
  page: number,
  size: number,
  totalElements: number,
): PageEnvelope<T> {
  return {
    content,
    page,
    size,
    totalElements,
    totalPages: totalElements === 0 ? 0 : Math.ceil(totalElements / size),
  };
}

/** Zod schema factory for the envelope, reused by OpenAPI generation. */
export function pageEnvelopeSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    page: z.number().int().min(0),
    size: z.number().int().min(1),
    totalElements: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}
