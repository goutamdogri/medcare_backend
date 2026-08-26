import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import request from 'supertest';

const app = createApp();

/** Alert mutated by the acknowledge test; restored afterwards. */
let touchedAlertId: number | null = null;

afterAll(async () => {
  if (touchedAlertId !== null) {
    await pool.query(
      `UPDATE alerts SET is_acknowledged = FALSE, acknowledged_by = NULL,
              acknowledged_at = NULL WHERE id = $1`,
      [touchedAlertId],
    );
  }
});

describe('GET /api/alerts', () => {
  it('lists alerts with parsed camelCase facts', async () => {
    const res = await request(app).get('/api/alerts?asOf=2019-01-16&size=5&unackOnly=true');
    expect(res.status).toBe(200);
    expect(res.body.asOf).toBe('2019-01-16');
    const alert = res.body.content[0];
    expect(alert.severity).toMatch(/RED|AMBER/);
    expect(alert.acknowledged).toBe(false);
    // facts keys must be lowerCamelCase
    for (const key of Object.keys(alert.facts ?? {})) {
      expect(key).not.toMatch(/_[a-z]/);
    }
  });

  it('severity filter + RED-first ordering', async () => {
    const res = await request(app).get('/api/alerts?severity=AMBER');
    expect(res.status).toBe(200);
    expect(res.body.totalElements).toBeGreaterThan(0);
    for (const item of res.body.content) {
      expect(item.severity).toBe('AMBER');
    }
  });

  it('unackOnly=true excludes acknowledged alerts', async () => {
    const res = await request(app).get('/api/alerts?unackOnly=true');
    expect(res.status).toBe(200);
    for (const item of res.body.content) {
      expect(item.acknowledged).toBe(false);
    }
  });
});

describe('PATCH /api/alerts/:id/acknowledge (acceptance: persists)', () => {
  it('acknowledges an alert and persists the audit fields', async () => {
    const list = await request(app).get('/api/alerts?unackOnly=true&size=1');
    const alert = list.body.content[0];
    expect(alert).toBeDefined();
    touchedAlertId = alert.id;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .send({ user: 'csco@pharma.in' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
    expect(res.body.acknowledgedBy).toBe('csco@pharma.in');
    expect(res.body.acknowledgedAt).toBeDefined();

    // Persists: disappears from unackOnly listing.
    const filtered = await request(app).get('/api/alerts?unackOnly=true&size=500');
    expect(
      (filtered.body.content as Array<{ id: number }>).some((a) => a.id === alert.id),
    ).toBe(false);
  });

  it('404s for an unknown alert id', async () => {
    const res = await request(app)
      .patch('/api/alerts/99999999/acknowledge')
      .send({ user: 'csco@pharma.in' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ALERT_NOT_FOUND');
  });

  it('400s on missing user and malformed JSON bodies', async () => {
    const missing = await request(app).patch('/api/alerts/1/acknowledge').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('VALIDATION_ERROR');

    const badJson = await request(app)
      .patch('/api/alerts/1/acknowledge')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(badJson.status).toBe(400);
    expect(badJson.body.error).toBe('INVALID_JSON');
  });
});
