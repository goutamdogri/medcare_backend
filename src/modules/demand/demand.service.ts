import { ApiError } from '../../shared/errors/api-errors.js';
import { addDays, formatIsoDate, parseIsoDate } from '../../shared/utils/dates.js';
import type { DemandHistoryQuery, DemandPoint, FluPoint, FluQuery } from './demand.schemas.js';
import { MAX_RANGE_DAYS } from './demand.schemas.js';
import {
  getDemandMaxDate,
  getFluMaxDate,
  listDemandRaw,
  listFlu,
  sumDemandGrouped,
} from './demand.repository.js';

interface ResolvedRange {
  from: string;
  to: string;
}

/**
 * Normalizes the requested window:
 * - explicit from+to wider than MAX_RANGE_DAYS → 400 (catch misuse early)
 * - missing bounds default to the newest available data, capped at the limit
 */
function resolveRange(
  from: string | undefined,
  to: string | undefined,
  maxDataDate: string | null,
  emptyCode: string,
): ResolvedRange {
  if (!maxDataDate) {
    throw ApiError.notFound('No data available', emptyCode);
  }
  const effectiveTo = to ?? maxDataDate;
  const toTime = parseIsoDate(effectiveTo);
  const effectiveFrom =
    from ?? formatIsoDate(addDays(toTime, -(MAX_RANGE_DAYS - 1)));
  const fromTime = parseIsoDate(effectiveFrom);

  if (from !== undefined && to !== undefined && toTime < fromTime) {
    throw ApiError.badRequest('`to` must be on or after `from`', { from, to });
  }
  const spanDays = Math.round((toTime.getTime() - fromTime.getTime()) / 86_400_000) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    throw ApiError.badRequest(
      `Date range exceeds the maximum of ${MAX_RANGE_DAYS} days (requested ${spanDays})`,
      { from: effectiveFrom, to: effectiveTo },
    );
  }
  return { from: effectiveFrom, to: effectiveTo };
}

/**
 * Actual sales series. Raw per-day rows are returned only for a full
 * SKU×region slice; any broader query is aggregated by date server-side
 * so payloads stay bounded (spec §4.5).
 */
export async function getDemandHistory(query: DemandHistoryQuery): Promise<DemandPoint[]> {
  const range = resolveRange(query.from, query.to, await getDemandMaxDate(), 'NO_DEMAND_DATA');
  if (query.skuId && query.region) {
    return listDemandRaw(query.skuId, query.region, range.from, range.to);
  }
  return sumDemandGrouped(query.skuId, query.region, range.from, range.to);
}

/** Flu/ILI burden index series. */
export async function getFluSeries(query: FluQuery): Promise<FluPoint[]> {
  const range = resolveRange(query.from, query.to, await getFluMaxDate(), 'NO_FLU_DATA');
  return listFlu(query.region, range.from, range.to);
}
