import { resolveAsOf } from '../../shared/asof/asof.js';
import { ApiError } from '../../shared/errors/api-errors.js';
import { buildPage } from '../../shared/pagination/pagination.js';
import type {
  AcknowledgeBody,
  AlertsQuery,
  AlertsResponse,
} from './alerts.schemas.js';
import { acknowledgeAlert, listAlerts } from './alerts.repository.js';

export async function getAlerts(query: AlertsQuery): Promise<AlertsResponse> {
  const asOf = await resolveAsOf(query.asOf);
  const page = await listAlerts(
    asOf,
    { severity: query.severity, type: query.type, unackOnly: query.unackOnly },
    query.page,
    query.size,
  );
  return {
    ...buildPage(page.content, query.page, query.size, page.totalElements),
    asOf,
  };
}

/**
 * Acknowledge an alert. Validates existence (404 ALERT_NOT_FOUND) and returns
 * the updated alert per spec §4.12.
 */
export async function acknowledge(id: number, body: AcknowledgeBody) {
  const alert = await acknowledgeAlert(id, body.user);
  if (!alert) {
    throw ApiError.notFound(`Alert ${id} does not exist`, 'ALERT_NOT_FOUND');
  }
  return alert;
}
