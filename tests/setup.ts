import dotenv from 'dotenv';

// Must run before any src module is imported by a test file:
// env.ts reads process.env once at import time.
dotenv.config({ path: '.env.test' });
process.env['NODE_ENV'] = 'test';

import { afterAll } from 'vitest';
import { closeDatabase } from '../src/config/database.js';

afterAll(async () => {
  await closeDatabase();
});
