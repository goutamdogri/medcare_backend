/**
 * Standalone migration CLI.
 *
 *   npm run migrate                 # apply all pending migrations
 *   npm run migrate:create <name>   # scaffold an empty, timestamp-ordered file
 *
 * Lets an operator (or CI) bring a database up to a given version without
 * booting the full backend.
 */
import { closeDatabase } from './database.js';
import { runMigrations } from './migrations.js';

async function main(): Promise<void> {
  try {
    await runMigrations();
  } finally {
    await closeDatabase();
  }
}

void main();
