import { resolveAsOf } from '../../shared/asof/asof.js';
import { buildPage } from '../../shared/pagination/pagination.js';
import type {
  TransfersQuery,
  TransfersResponse,
  WriteoffsQuery,
  WriteoffsResponse,
} from './allocation.schemas.js';
import {
  fetchTransfersSummary,
  listTransfers,
  listWriteoffs,
} from './allocation.repository.js';

export async function getTransfers(query: TransfersQuery): Promise<TransfersResponse> {
  const asOf = await resolveAsOf(query.asOf);
  const [page, summary] = await Promise.all([
    listTransfers(asOf, query.reason, query.page, query.size),
    fetchTransfersSummary(asOf),
  ]);
  return {
    ...buildPage(page.content, query.page, query.size, page.totalElements),
    asOf,
    summary,
  };
}

export async function getWriteoffs(query: WriteoffsQuery): Promise<WriteoffsResponse> {
  const asOf = await resolveAsOf(query.asOf);
  const page = await listWriteoffs(asOf, query.page, query.size);
  return {
    ...buildPage(page.content, query.page, query.size, page.totalElements),
    asOf,
    totals: page.totals,
  };
}
