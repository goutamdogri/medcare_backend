import { env } from '../../config/env.js';
import { TtlCache } from '../../shared/cache/ttl-cache.js';
import { fetchAllLanes, fetchAllLocations, fetchAllSkus } from './master.repository.js';
import type { MasterLane, MasterLocation, MasterSku } from './master.schemas.js';

/**
 * Master tables are static, so dumps are cached in memory for an hour
 * (plus `Cache-Control` on the wire — see controller).
 */
const masterCaches = {
  skus: new TtlCache<MasterSku[]>(env.MASTER_CACHE_TTL_MS),
  locations: new TtlCache<MasterLocation[]>(env.MASTER_CACHE_TTL_MS),
  lanes: new TtlCache<MasterLane[]>(env.MASTER_CACHE_TTL_MS),
};

export function getSkus(): Promise<MasterSku[]> {
  return masterCaches.skus.wrap('all', fetchAllSkus);
}

export function getLocations(): Promise<MasterLocation[]> {
  return masterCaches.locations.wrap('all', fetchAllLocations);
}

export function getLanes(): Promise<MasterLane[]> {
  return masterCaches.lanes.wrap('all', fetchAllLanes);
}
