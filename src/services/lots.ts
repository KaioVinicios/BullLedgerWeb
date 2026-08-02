import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * Lots, read-only.
 *
 * The API also renames them (`PATCH /api/lots/{id}/`) and archives them; Phase
 * 6 deliberately consumes neither. What the ledger needs a lot for is naming
 * the batch an exit draws from — and the figures that make that choice
 * meaningful, how much is left in each, do not live here at all. They come from
 * the holding projection (`services/portfolio.ts`), which is why this list is
 * the picker's fallback rather than its primary source.
 */
export type Lot = components["schemas"]["Lot"];

type PaginatedLotList = components["schemas"]["PaginatedLotList"];

export type LotListQuery = NonNullable<
  operations["api_lots_list"]["parameters"]["query"]
>;

export const lotKeys = createResourceKeys<LotListQuery>("lots");

export const listLots = (query: LotListQuery) =>
  request(api.get<PaginatedLotList>(ENDPOINTS.lots, { params: query }));
