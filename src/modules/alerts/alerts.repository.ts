import { query } from '../../config/database.js';
import type { AlertItem } from './alerts.schemas.js';
import { mapKeysToCamel, toIsoTimestamp } from '../../shared/utils/mapping.js';

interface AlertRow {
  id: number;
  severity: string;
  type: string;
  sku_id: string;
  region: string;
  facts: Record<string, unknown> | null;
  action: string | null;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: Date | string | null;
  created_at: Date | string;
}

function mapAlert(row: AlertRow): AlertItem {
  return {
    id: Number(row.id),
    severity: row.severity,
    type: row.type,
    skuId: row.sku_id,
    region: row.region,
    facts: mapKeysToCamel(row.facts ?? {}),
    action: row.action,
    acknowledged: row.is_acknowledged,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: toIsoTimestamp(row.acknowledged_at),
    createdAt: toIsoTimestamp(row.created_at)!,
  };
}

export async function listAlerts(
  asOf: string,
  filters: { severity?: 'RED' | 'AMBER'; type?: string; unackOnly: boolean },
  page: number,
  size: number,
): Promise<{ content: AlertItem[]; totalElements: number }> {
  const clauses = ['as_of_date = $1'];
  const params: unknown[] = [asOf];

  if (filters.severity !== undefined) {
    params.push(filters.severity);
    clauses.push(`severity = $${params.length}`);
  }
  if (filters.type !== undefined) {
    params.push(filters.type);
    clauses.push(`type = $${params.length}`);
  }
  if (filters.unackOnly) {
    clauses.push('is_acknowledged = FALSE');
  }

  const whereClause = clauses.join(' AND ');
  const whereParams = [...params];
  const dataParams = [...params, size, page * size];
  const result = await query<AlertRow & { total_count: string }>(
    `SELECT id, severity, type, sku_id, region, facts, action, is_acknowledged,
            acknowledged_by, acknowledged_at, created_at,
            COUNT(*) OVER() AS total_count
     FROM alerts
     WHERE ${whereClause}
     ORDER BY CASE severity WHEN 'RED' THEN 0 ELSE 1 END, id
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  let totalElements = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  if (totalElements === 0 && result.rows.length === 0) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM alerts WHERE ${whereClause}`,
      whereParams,
    );
    totalElements = Number(countResult.rows[0]?.count ?? 0);
  }

  return {
    content: result.rows.map(mapAlert),
    totalElements,
  };
}

/**
 * The API's only write operation (v1). Idempotent: re-acknowledging refreshes
 * the audit fields. Returns the updated alert, or null when the id is unknown.
 */
export async function acknowledgeAlert(id: number, user: string): Promise<AlertItem | null> {
  const result = await query<AlertRow>(
    `UPDATE alerts
     SET is_acknowledged = TRUE, acknowledged_by = $2, acknowledged_at = NOW()
     WHERE id = $1
     RETURNING id, severity, type, sku_id, region, facts, action, is_acknowledged,
               acknowledged_by, acknowledged_at, created_at`,
    [id, user],
  );
  const row = result.rows[0];
  return row ? mapAlert(row) : null;
}
