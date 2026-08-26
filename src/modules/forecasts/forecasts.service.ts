import { resolveAsOf } from '../../shared/asof/asof.js';
import { buildPage } from '../../shared/pagination/pagination.js';
import type { ForecastsResponse } from './forecasts.schemas.js';
import type { ForecastQuery } from './forecasts.schemas.js';
import { fetchModelMix, listForecasts } from './forecasts.repository.js';

export async function getForecasts(query: ForecastQuery): Promise<ForecastsResponse> {
  const asOf = await resolveAsOf(query.asOf);
  const [page, modelMix] = await Promise.all([
    listForecasts(asOf, query, query.page, query.size),
    fetchModelMix(asOf),
  ]);
  return {
    ...buildPage(page.content, query.page, query.size, page.totalElements),
    asOf,
    modelMix,
  };
}
