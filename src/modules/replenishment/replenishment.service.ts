import { resolveAsOf } from '../../shared/asof/asof.js';
import { buildPage } from '../../shared/pagination/pagination.js';
import type {
  ReplenishmentCoverage,
  ReplenishmentQuery,
  ReplenishmentResponse,
  ReplenishmentSummary,
  SkuCoverageParams,
} from './replenishment.schemas.js';
import { fetchSkuCoverage, fetchSummary, listReplenishment } from './replenishment.repository.js';

export async function getReplenishmentOrders(query: ReplenishmentQuery): Promise<ReplenishmentResponse> {
  const asOf = await resolveAsOf(query.asOf);
  const page = await listReplenishment(
    asOf,
    { status: query.status, criticality: query.criticality, region: query.region },
    query.sort,
    query.direction,
    query.page,
    query.size,
  );
  return {
    ...buildPage(page.content, query.page, query.size, page.totalElements),
    asOf,
  };
}

export async function getReplenishmentSummary(asOfRequested?: string): Promise<ReplenishmentSummary> {
  const asOf = await resolveAsOf(asOfRequested);
  return { asOf, ...(await fetchSummary(asOf)) };
}

export async function getSkuCoverage(
  asOfRequested: string | undefined,
  params: SkuCoverageParams,
): Promise<ReplenishmentCoverage> {
  const asOf = await resolveAsOf(asOfRequested);
  return fetchSkuCoverage(asOf, params.skuId, params.region);
}
