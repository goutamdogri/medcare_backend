import { getLatestRunDate } from '../../shared/asof/asof.js';
import type { MetaResponse } from './meta.schemas.js';
import {
  fetchLatestSuccessfulRun,
  fetchRegions,
  fetchSkus,
} from './meta.repository.js';

/** Aggregates the one-shot bootstrap payload the SPA loads on boot. */
export async function getMeta(): Promise<MetaResponse> {
  const [asOf, latestRun, skus, regions] = await Promise.all([
    getLatestRunDate(),
    fetchLatestSuccessfulRun(),
    fetchSkus(),
    fetchRegions(),
  ]);
  return { asOf, latestRun, skus, regions };
}
