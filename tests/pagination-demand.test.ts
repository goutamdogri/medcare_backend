import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import request from 'supertest';

const app = createApp();

describe('Pagination contract', () => {
  it('forecasts: default page envelope with totalElements', async () => {
    const res = await request(app).get('/api/forecasts');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(0);
    expect(res.body.size).toBe(50);
    expect(res.body.content).toHaveLength(50);
    expect(res.body.totalElements).toBe(8064); // spec §2: 8064 forecast rows per run
    expect(res.body.totalPages).toBe(Math.ceil(res.body.totalElements / 50));
    expect(res.body.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.modelMix.lgbm).toBeGreaterThan(0);
  });

  it('forecasts: honors page/size and horizonMax filter', async () => {
    const res = await request(app).get(
      '/api/forecasts?page=0&size=10&skuId=M01AB-01&region=DC_DELHI&horizonMax=5',
    );
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(0);
    expect(res.body.content).toHaveLength(5);
    for (const item of res.body.content) {
      expect(item.horizon).toBeLessThanOrEqual(5);
      expect(item.skuId).toBe('M01AB-01');
      expect(item.region).toBe('DC_DELHI');
    }
    expect(res.body.totalElements).toBe(5);
  });

  it('rejects out-of-range pagination params (early error detection)', async () => {
    const res = await request(app).get('/api/replenishment?page=-1');
    expect(res.status).toBe(400);

    const res2 = await request(app).get('/api/replenishment?size=501');
    expect(res2.status).toBe(400);
    expect(res2.body.details[0].path).toBe('size');

    const res3 = await request(app).get('/api/replenishment?unknownParam=1');
    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe('VALIDATION_ERROR');
  });

  it('replenishment: sort=dos puts NULL days-of-supply last', async () => {
    const res = await request(app).get('/api/replenishment?sort=dos&size=500');
    expect(res.status).toBe(200);
    const items = res.body.content as Array<{ daysOfSupplyOnHand: number | null }>;
    const nulls = items.filter((i) => i.daysOfSupplyOnHand === null);
    const nonNulls = items.filter((i) => i.daysOfSupplyOnHand !== null);
    if (nulls.length && nonNulls.length) {
      expect(items.indexOf(nulls[0]!)).toBeGreaterThan(items.lastIndexOf(nonNulls.at(-1)!));
    }
  });

  it('replenishment: status filter narrows results', async () => {
    const all = await request(app).get('/api/replenishment?size=500');
    const filtered = await request(app).get('/api/replenishment?status=stockout_risk&size=500');
    expect(filtered.status).toBe(200);
    for (const item of filtered.body.content) {
      expect(item.status).toBe('stockout_risk');
    }
    expect(filtered.body.totalElements).toBeLessThan(all.body.totalElements);
  });
});

describe('Demand & flu endpoints', () => {
  it('demand history groups by date when unfiltered', async () => {
    const res = await request(app).get('/api/demand/history?from=2018-12-01&to=2018-12-07');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(7);
    expect(res.body[0]).toEqual({ date: '2018-12-01', units: expect.any(Number) });
  });

  it('demand history returns raw slice when sku+region given', async () => {
    const res = await request(app).get(
      '/api/demand/history?skuId=M01AB-01&region=DC_MUMBAI&from=2019-01-01&to=2019-01-17',
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(17);
  });

  it('rejects ranges wider than the 400-day cap', async () => {
    const res = await request(app).get('/api/demand/history?from=2017-01-01&to=2019-01-17');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message)).toContain('400 days');
  });

  it('flu series respects region + range filters', async () => {
    const res = await request(app).get('/api/flu?region=DC_MUMBAI&from=2019-01-15&to=2019-01-17');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].region).toBe('DC_MUMBAI');
    expect(typeof res.body[0].indexValue).toBe('number');
  });
});
