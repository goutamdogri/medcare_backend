import { createApp } from '../src/app.js';
import { checkDatabase } from '../src/config/database.js';
import request from 'supertest';

const app = createApp();

/** Shared guard: skip suite (instead of failing) if local DB is unreachable. */
export async function dbAvailable(): Promise<boolean> {
  try {
    await checkDatabase();
    return true;
  } catch {
    // eslint-disable-next-line no-console -- intentional diagnostic for skipped suites
    console.warn('DATABASE NOT AVAILABLE — skipping integration assertions');
    return false;
  }
}

export function api() {
  return request(app);
}
