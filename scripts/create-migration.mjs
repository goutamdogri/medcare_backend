#!/usr/bin/env node
/**
 * Scaffold a new versioned migration file.
 *
 *   npm run migrate:create add_orders_audit
 *
 * Creates db/migrations/<next-version>_<name>.sql using the next sequential
 * version number, so migrations always apply in order. Never reorders or
 * overwrites an existing migration.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'db', 'migrations');
const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run migrate:create <migration_name>');
  process.exit(1);
}
if (!/^[a-z0-9_]+$/.test(name)) {
  console.error('Name must be snake_case (letters, digits, underscores).');
  process.exit(1);
}

await fs.mkdir(dir, { recursive: true });

const files = (await fs.readdir(dir))
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();
const last = files.length ? Number.parseInt(files[files.length - 1].slice(0, 4), 10) : 0;
const next = String(last + 1).padStart(4, '0');
const target = path.join(dir, `${next}_${name}.sql`);

const body = `-- =============================================================
-- ${next}_${name}.sql
--
-- Describe what this migration changes and why.
-- Runs exactly once, in sequence, tracked in schema_migrations.
-- =============================================================
`;

await fs.writeFile(target, body, { flag: 'wx' });
console.log(`Created ${target}`);
