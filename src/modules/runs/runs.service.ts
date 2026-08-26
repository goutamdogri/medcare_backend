import { buildPage } from '../../shared/pagination/pagination.js';
import type { RunsQuery } from './runs.schemas.js';
import { listRuns } from './runs.repository.js';

export async function getRuns(query: RunsQuery) {
  // `limit` (spec alias) maps to `size`; explicit `size` takes precedence.
  const size = query.size ?? query.limit ?? 50;
  const page = await listRuns(query.page, size);
  return buildPage(page.content, query.page, size, page.totalElements);
}

