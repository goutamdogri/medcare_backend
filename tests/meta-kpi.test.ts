import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import request from 'supertest';

const app = createApp();

describe('GET /api/meta (acceptance: 32 SKUs + 6 regions + resolved asOf)', () => {
  it('returns the full bootstrap payload', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.skus).toHaveLength(32);
    expect(res.body.regions).toHaveLength(6);
    const sku = res.body.skus[0];
    for (const key of ['skuId', 'brandName', 'atcCode', 'criticality', 'unitCostInr']) {
      expect(sku).toHaveProperty(key);
    }
    expect(res.body.latestRun.status).toBe('success');
    expect(Array.isArray(res.body.latestRun.modelsUsed)).toBe(true);
  });
});

describe('GET /api/kpi', () => {
  it('compares both policies with computed improvements', async () => {
    const res = await request(app).get('/api/kpi');
    expect(res.status).toBe(200);
    expect(res.body.proposed.fillRatePct).toBeCloseTo(92.5, 2);
    expect(res.body.statusQuo.fillRatePct).toBeCloseTo(83.45, 2);
    expect(res.body.improvement.fillRatePctDelta).toBeCloseTo(9.05, 2);
    expect(res.body.improvement.writeoffSavingInr).toBeGreaterThan(0);
  });

  it('404s cleanly for a future asOf (acceptance checklist)', async () => {
    const res = await request(app).get('/api/kpi?asOf=2019-05-01');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RUN_NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at .+node_modules/i);
  });

  it('rejects malformed asOf with 400 + field details', async () => {
    const res = await request(app).get('/api/kpi?asOf=17-01-2019');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details[0].path).toBe('asOf');
  });
});

describe('GET /api/kpi/daily-curves (acceptance: aggregated 42×2)', () => {
  it('returns exactly 42 points per policy, never raw rows', async () => {
    const res = await request(app).get('/api/kpi/daily-curves');
    expect(res.status).toBe(200);
    expect(res.body.series.proposed).toHaveLength(42);
    expect(res.body.series.statusQuo).toHaveLength(42);
    const point = res.body.series.proposed[0];
    expect(Object.keys(point).sort()).toEqual(
      ['avgEndingInventory', 'date', 'demand', 'expiredValueInr', 'fulfilled', 'unfulfilled'].sort(),
    );
  });

  it('cumulative write-off series is non-decreasing per policy', async () => {
    const res = await request(app).get('/api/kpi/writeoff-cumulative');
    expect(res.status).toBe(200);
    for (const series of [res.body.series.proposed, res.body.series.statusQuo]) {
      for (let i = 1; i < series.length; i++) {
        expect(series[i]!.cumulativeExpiredValueInr).toBeGreaterThanOrEqual(
          series[i - 1]!.cumulativeExpiredValueInr,
        );
      }
    }
  });
});
