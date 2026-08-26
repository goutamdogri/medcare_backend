import { resolveAsOf } from '../../shared/asof/asof.js';
import { ApiError } from '../../shared/errors/api-errors.js';
import type {
  AgingResponse,
  BucketTotals,
  LocationAging,
} from './inventory.schemas.js';
import {
  fetchBucketRows,
  fetchStatusDistribution,
  resolveSnapshotDate,
} from './inventory.repository.js';

const BUCKETS = ['d0_30', 'd31_60', 'd61_90', 'd90plus'] as const;

function emptyBuckets(): Record<(typeof BUCKETS)[number], BucketTotals> {
  return { d0_30: { units: 0, valueInr: 0 }, d31_60: { units: 0, valueInr: 0 }, d61_90: { units: 0, valueInr: 0 }, d90plus: { units: 0, valueInr: 0 } };
}

export async function getInventoryAging(asOfRequested?: string): Promise<AgingResponse> {
  const asOf = await resolveAsOf(asOfRequested);
  const snapshotDate = await resolveSnapshotDate(asOf);
  if (!snapshotDate) {
    throw ApiError.notFound(
      `No inventory snapshot on or before asOf=${asOf}`,
      'NO_INVENTORY_SNAPSHOT',
    );
  }

  const [bucketRows, statusDistribution] = await Promise.all([
    fetchBucketRows(snapshotDate),
    fetchStatusDistribution(snapshotDate),
  ]);

  // Roll the per-location×SKU rows up by location for the stacked-bar view.
  const byLocationMap = new Map<string, LocationAging>();
  for (const row of bucketRows) {
    let entry = byLocationMap.get(row.location);
    if (!entry) {
      entry = { location: row.location, buckets: emptyBuckets(), totalUnits: 0, totalValueInr: 0 };
      byLocationMap.set(row.location, entry);
    }
    entry.buckets[row.bucket].units += row.units;
    entry.buckets[row.bucket].valueInr += row.valueInr;
    entry.totalUnits += row.units;
    entry.totalValueInr += row.valueInr;
  }

  return {
    asOf,
    snapshotDate,
    buckets: bucketRows,
    byLocation: [...byLocationMap.values()].sort((a, b) => a.location.localeCompare(b.location)),
    statusDistribution,
  };
}

export { BUCKETS as AGING_BUCKETS };
