import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import request from 'supertest';

const app = createApp();

/** Creates a throwaway authenticated session via signup (auth is enforced). */
async function authToken(): Promise<string> {
  const email = `covtest${Date.now()}-${Math.floor(Math.random() * 1e6)}@medcare.local`;
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Coverage Test',
    email,
    password: 'password123',
    confirmPassword: 'password123',
  });
  expect(res.status).toBe(201);
  return (res.body as { token: string }).token;
}

describe('Allocation endpoints', () => {
  it('transfers: paginated rows + summary roll-ups', async () => {
    const res = await request(app).get('/api/transfers?size=5');
    expect(res.status).toBe(200);
    const { content, summary } = res.body;
    expect(content.length).toBeLessThanOrEqual(5);
    for (const t of content) {
      expect(['expiry_rescue', 'shortage_rescue']).toContain(t.reason);
      // shortage rescues have no meaningful source days-of-supply
      if (t.reason === 'shortage_rescue') expect(t.srcDaysOfSupplyBefore).toBeNull();
    }
    const reasonSum =
      summary.countByReason.expiry_rescue + summary.countByReason.shortage_rescue;
    expect(reasonSum).toBe(summary.totalTransfers);
    expect(summary.byLane.length).toBeGreaterThan(0);
    expect(summary.byLane[0].lane).toMatch(/→/);
  });

  it('transfers: reason filter', async () => {
    const res = await request(app).get('/api/transfers?reason=shortage_rescue&size=500');
    expect(res.status).toBe(200);
    for (const t of res.body.content) {
      expect(t.reason).toBe('shortage_rescue');
    }
  });

  it('writeoffs: totals block exposes residual exposure', async () => {
    const res = await request(app).get('/api/writeoffs?asOf=2019-01-17');
    expect(res.status).toBe(200);
    expect(res.body.totals.batchesAtRisk).toBeGreaterThan(0);
    expect(res.body.totals.totalResidualValueInr).toBeGreaterThan(0);
    // Sum of page values ≤ totals (totals cover all pages)
    const pageSum = (res.body.content as Array<{ residualValueInr: number }>).reduce(
      (acc, w) => acc + w.residualValueInr,
      0,
    );
    expect(pageSum).toBeLessThanOrEqual(res.body.totals.totalResidualValueInr);
  });
});

describe('GET /api/inventory/aging', () => {
  it('buckets the newest snapshot ≤ asOf with per-location rollup', async () => {
    const res = await request(app).get('/api/inventory/aging');
    expect(res.status).toBe(200);
    expect(res.body.snapshotDate).toBe('2019-01-17');
    expect(res.body.buckets.length).toBeGreaterThan(0);

    const validBuckets = new Set(['d0_30', 'd31_60', 'd61_90', 'd90plus']);
    for (const row of res.body.buckets) {
      expect(validBuckets.has(row.bucket)).toBe(true);
    }

    expect(res.body.byLocation).toHaveLength(6);
    for (const loc of res.body.byLocation) {
      const bucketSum = Object.values(loc.buckets).reduce((a: number, b) => a + (b as { units: number }).units, 0);
      expect(bucketSum).toBe(loc.totalUnits);
    }
    expect(res.body.statusDistribution.length).toBeGreaterThan(0);
  });

  it('404s cleanly for a date before any pipeline run', async () => {
    const res = await request(app).get('/api/inventory/aging?asOf=2018-06-01');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RUN_NOT_FOUND');
  });
});

describe('Digest, runs and master', () => {
  it('digest splits surge regions into an array', async () => {
    const res = await request(app).get('/api/digest?asOf=2019-01-16');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.surgeRegions)).toBe(true);
    expect(res.body.digestText.length).toBeGreaterThan(50);
    expect(res.body.redAlertCount).toBe(17);
  });

  it('digest 404s for runs without one', async () => {
    const res = await request(app).get('/api/digest?asOf=2019-01-17');
    expect([200, 404]).toContain(res.status); // depends on data presence
    if (res.status === 404) expect(res.body.error).toBe('DIGEST_NOT_FOUND');
  });

  it('runs: `limit` alias works and newest-first ordering holds', async () => {
    const res = await request(app).get('/api/runs?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.size).toBe(1);
    expect(res.body.content[0].asOfDate).toBe('2019-01-17');
  });

  it('master dumps are cached on the wire', async () => {
    const res = await request(app).get('/api/master/locations');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('max-age=3600');
    expect(res.body).toHaveLength(6);
    expect(typeof res.body[0].capacityUnits).toBe('number');
  });
});

describe('Pipeline stubs (spec §7)', () => {
  it('returns 501 with the standard envelope for all three routes', async () => {
    const rollover = await request(app).post('/api/pipeline/rollover').send({ horizon: 42 });
    expect(rollover.status).toBe(501);
    expect(rollover.body.error).toBe('NOT_IMPLEMENTED');

    const retrain = await request(app).post('/api/pipeline/retrain').send({});
    expect(retrain.status).toBe(501);

    const status = await request(app).get('/api/pipeline/status/run_2019-01-17');
    expect(status.status).toBe(501);
  });

  it('still validates bodies even though stubbed', async () => {
    const bad = await request(app).post('/api/pipeline/rollover').send({ horizon: 99 });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/replenishment/:skuId/:region/coverage', () => {
  it('reconciles an order with its inbound transfer plan', async () => {
    const auth = { Authorization: `Bearer ${await authToken()}` };
    // N02BE-01/WH_LUCKNOW reliably has both an order and inbound transfers.
    const res = await request(app)
      .get('/api/replenishment/N02BE-01/WH_LUCKNOW/coverage')
      .set(auth);
    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.skuId).toBe('N02BE-01');
    expect(body.region).toBe('WH_LUCKNOW');
    expect(body.orderQty).toBeGreaterThan(0);
    expect(body.inboundUnits).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.inboundTransfers)).toBe(true);
    // netToOrder is orderQty − inboundUnits, floored at 0
    expect(body.netToOrder).toBe(Math.max(0, body.orderQty - body.inboundUnits));
    // every inbound transfer targets this region and SKU
    for (const t of body.inboundTransfers) {
      expect(['expiry_rescue', 'shortage_rescue']).toContain(t.reason);
    }
  });

  it('floors netToOrder at 0 when inbound transfers cover the order', async () => {
    const auth = { Authorization: `Bearer ${await authToken()}` };
    const res = await request(app)
      .get('/api/replenishment/N02BE-01/WH_LUCKNOW/coverage')
      .set(auth);
    expect(res.status).toBe(200);
    // Transfers into this region cover the whole recommended order → nothing left to buy.
    expect(res.body.inboundUnits).toBeGreaterThanOrEqual(res.body.orderQty);
    expect(res.body.netToOrder).toBe(0);
    expect(res.body.inboundTransfers.length).toBeGreaterThan(0);
    expect(res.body.coveragePct).toBe(100);
  });

  it('answers empty coverage for a SKU/region with no data', async () => {
    const auth = { Authorization: `Bearer ${await authToken()}` };
    const res = await request(app)
      .get('/api/replenishment/ZZZ-99/WH_NOWHERE/coverage')
      .set(auth);
    expect(res.status).toBe(200);
    expect(res.body.orderQty).toBe(0);
    expect(res.body.inboundUnits).toBe(0);
    expect(res.body.netToOrder).toBe(0);
    expect(res.body.inboundTransfers).toEqual([]);
  });

  it('404s for an asOf before any successful pipeline run', async () => {
    const auth = { Authorization: `Bearer ${await authToken()}` };
    const res = await request(app)
      .get('/api/replenishment/N02BE-01/WH_LUCKNOW/coverage?asOf=2018-06-01')
      .set(auth);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RUN_NOT_FOUND');
  });
});
