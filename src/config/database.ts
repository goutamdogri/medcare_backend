/**
 * PostgreSQL access layer.
 *
 * - Single shared pool; repositories issue parameterized queries through it.
 * - DATE columns (OID 1082) are returned as raw `yyyy-MM-dd` strings so that
 *   serialization never depends on the server/container timezone.
 * - Pool-level errors are logged (they surface asynchronously when an idle
 *   client dies — without this handler they vanish silently).
 */
import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

// Serialize DATE as string, not JS Date (avoids TZ drift on yyyy-MM-dd fields).
pg.types.setTypeParser(1082, (value: string) => value);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  application_name: 'medcare-backend',
});

pool.on('error', (err) => {
  // Unexpected idle-client errors would otherwise crash or go unnoticed.
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

/** Typed query helper used by every repository. */
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

/** Connectivity probe used by /health and startup checks. */
export async function checkDatabase(): Promise<void> {
  await query('SELECT 1');
}

/**
 * Startup sanity check: verify every table the API depends on exists.
 * A missing table means the schema was never applied — fail loudly now
 * rather than returning 500s on every endpoint.
 */
const REQUIRED_TABLES = [
  'sku_master',
  'locations',
  'lanes',
  'demand_history',
  'disease_burden_index',
  'inventory_batches',
  'forecasts_final',
  'replenishment_orders',
  'transfer_plan',
  'writeoff_risk',
  'simulation_daily',
  'kpi_summary',
  'alerts',
  'alert_digest',
  'rolling_run_log',
  'pipeline_state',
  'pipeline_run',
  'users',
] as const;

export async function assertSchema(): Promise<void> {
  const result = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES],
  );
  const found = new Set(result.rows.map((r) => r.table_name));
  const missing = REQUIRED_TABLES.filter((t) => !found.has(t));
  if (missing.length > 0) {
    throw new Error(
      `Database schema incomplete after migrations — missing tables: ${missing.join(', ')}. ` +
        `These tables are not covered by any migration in db/migrations. ` +
        `Add a new numbered migration (e.g. 004_<name>.sql) for the "${env.DATABASE_URL.split('/').pop()}" database.`,
    );
  }
}

/** Close all pooled connections (used by graceful shutdown and tests). */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
