/**
 * Fail-fast environment configuration.
 *
 * The process refuses to boot when any variable is missing or malformed —
 * misconfiguration is caught at startup instead of at first request.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url('must be a valid postgresql:// connection string')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'must use the postgresql:// scheme',
    })
    .default('postgresql://postgres:1828@localhost:5432/medcare'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  MASTER_CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
  ML_SIDECAR_URL: z.string().url().default('http://localhost:8000'),
  MIGRATIONS_DIR: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for HS256')
    .default('dev-only-medcare-control-tower-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console -- logger depends on env, so bootstrap errors go raw
  console.error('[boot] Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
