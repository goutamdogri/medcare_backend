/**
 * Versioned PostgreSQL migrations.
 *
 * An industry-standard, forward-only migration runner so that ANY database
 * — brand new, or partially advanced — upgrades itself in a deterministic,
 * sequential order to match the version of the backend that is currently
 * running.
 *
 * How it works
 * ------------
 *   1. A `schema_migrations` table tracks every migration that has already
 *      been applied (version = integer prefix of the filename, e.g. 0001).
 *   2. The runner scans `db/migrations/*.sql`, sorts by version, and runs only
 *      those whose version is greater than the highest version already
 *      recorded — in ascending order.
 *   3. Each migration runs inside its own transaction on a single pooled
 *      connection: the file's SQL is applied and its version is recorded
 *      atomically. If the file fails, the whole migration is rolled back and
 *      nothing is recorded.
 *   4. A Postgres advisory lock serializes execution across multiple backend
 *      instances that boot simultaneously (zero-downtime rolling deploys), so
 *      two instances can never apply the same migration concurrently.
 *
 * Because versions are stored and compared, a database at version 4 only
 * applies migrations 5, 6, … — never 1–4 again — and a brand-new database
 * applies them all from 1 upward. Forward-only: never edit a shipped
 * migration file; add a new one instead.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from './env.js';
import { pool } from './database.js';
import { logger } from './logger.js';

const MIGRATION_VERSION_RE = /^(\d{4})_(.+)\.sql$/;

interface Migration {
  version: number;
  name: string;
  file: string;
}

/** Arbitrary, fixed id dedicated to schema migrations. */
const ADVISORY_LOCK_ID = 782_314_159;

function migrationsDir(): string {
  return env.MIGRATIONS_DIR || path.join(process.cwd(), 'db', 'migrations');
}

async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER      PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedVersions(): Promise<Set<number>> {
  const result = await pool.query<{ version: number }>(
    'SELECT version FROM schema_migrations',
  );
  return new Set(result.rows.map((r) => r.version));
}

async function discoverMigrations(): Promise<Migration[]> {
  const dir = migrationsDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    logger.warn({ dir }, 'Migrations directory not found — skipping migrations');
    return [];
  }

  const migrations: Migration[] = [];
  for (const file of entries) {
    const match = MIGRATION_VERSION_RE.exec(file);
    if (!match || !match[1] || !match[2]) continue;
    migrations.push({
      version: Number.parseInt(match[1], 10),
      name: match[2],
      file: path.join(dir, file),
    });
  }
  migrations.sort((a, b) => a.version - b.version);
  return migrations;
}

/**
 * Apply every pending migration in ascending order. Safe to call on every
 * boot — it is a no-op when the database is already up to date.
 *
 * @throws if any migration fails — the process must not start against a
 *         partially-migrated schema.
 */
export async function runMigrations(): Promise<void> {
  await ensureTrackingTable();
  let pending = await discoverMigrations();
  if (pending.length === 0) {
    logger.info('No migration files found');
    return;
  }

  const applied = await appliedVersions();
  pending = pending.filter((m) => !applied.has(m.version));
  if (pending.length === 0) {
    logger.info('Database schema is up to date (no pending migrations)');
    return;
  }
  logger.info(
    { pending: pending.map((m) => m.version) },
    'Applying pending database migrations',
  );

  // Serialize across concurrently booting instances (single-writer).
  const lockClient = await pool.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
    const latestApplied = await appliedVersions();
    for (const m of pending) {
      if (latestApplied.has(m.version)) {
        continue; // another instance applied it while we waited for the lock
      }
      await applyMigration(m);
    }
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]);
    } finally {
      lockClient.release();
    }
  }
}

async function applyMigration(m: Migration): Promise<void> {
  const sql = await fs.readFile(m.file, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [m.version, m.name],
    );
    await client.query('COMMIT');
    logger.info({ version: m.version, name: m.name }, 'Applied migration');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection already broken; nothing more we can do
    }
    logger.error(
      { version: m.version, name: m.name, err },
      'Migration failed — rolled back',
    );
    throw err;
  } finally {
    client.release();
  }
}
