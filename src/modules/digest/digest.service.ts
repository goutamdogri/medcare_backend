import { resolveAsOf } from '../../shared/asof/asof.js';
import { ApiError } from '../../shared/errors/api-errors.js';
import { csvToArray } from '../../shared/utils/mapping.js';
import type { DigestResponse } from './digest.schemas.js';
import { fetchDigest } from './digest.repository.js';

export async function getDigest(asOfRequested?: string): Promise<DigestResponse> {
  const asOf = await resolveAsOf(asOfRequested);
  const row = await fetchDigest(asOf);
  if (!row) {
    throw ApiError.notFound(`No digest generated for asOf=${asOf}`, 'DIGEST_NOT_FOUND');
  }
  return {
    asOf,
    reviewMode: row.review_mode,
    surgeRegions: csvToArray(row.surge_regions),
    redAlertCount: Number(row.red_alert_count),
    digestText: row.digest_text,
    modelUsed: row.model_used,
  };
}
