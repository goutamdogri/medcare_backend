/**
 * Row-mapping helpers. PostgreSQL returns NUMERIC as string and BIGINT as
 * string; these helpers convert to JSON-friendly primitives once, at the
 * repository boundary, so services/controllers only see typed DTOs.
 */

/** string|number|null → number|null (NUMERIC/int8 columns). */
export function toNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/** number|null with fixed decimal places (matches stored column precision). */
export function toNumRounded(value: unknown, dp: number): number | null {
  const n = toNum(value);
  return n === null ? null : round(n, dp);
}

export function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** TIMESTAMP column → ISO-8601 string (or null). */
export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** snake_case identifier → lowerCamelCase. */
export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively rewrites object keys from snake_case to lowerCamelCase. */
export function mapKeysToCamel<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => mapKeysToCamel(v)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[snakeToCamel(k)] = mapKeysToCamel(v);
    }
    return out as T;
  }
  return value;
}

/** `"a,b, c"` → `["a","b","c"]`; null-safe, empty array when blank. */
export function csvToArray(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
