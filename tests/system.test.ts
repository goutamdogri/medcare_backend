import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('System', () => {
  beforeAll(async () => {
    // Fail fast with a clear error if the DB is not reachable.
    await import('../src/config/database.js').then((m) => m.checkDatabase());
  });

  it('GET /health → 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('unknown routes render the standard 404 envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ROUTE_NOT_FOUND');
    expect(res.body.path).toBe('/api/does-not-exist');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
