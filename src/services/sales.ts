import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * The sales history — every lot that has been sold from.
 *
 * A sibling of the holding detail rather than a replacement: that one answers
 * what a position is worth now, this one what a contribution returned when it
 * was disposed of. `profit_rate` arrives as a decimal-string fraction — the
 * same convention every other rate in this app follows — already measured in
 * the asset's own currency, so no division and no conversion happens on this
 * side.
 *
 * Keyed under `PORTFOLIO_KEY`, so every ledger and pricing write invalidates
 * it with no rule of its own — see `queryKeys.ts`.
 */
export type SaleRow = components["schemas"]["SaleRow"];
export type SaleExit = components["schemas"]["SaleExit"];

type PaginatedSaleRowList = components["schemas"]["PaginatedSaleRowList"];

/** From the operation, never hand-written. */
export type SalesListQuery = NonNullable<
  operations["api_portfolio_sales_retrieve"]["parameters"]["query"]
>;

export const salesKeys = {
  all: [...PORTFOLIO_KEY, "sales"] as const,
  list: (query: SalesListQuery) =>
    [...PORTFOLIO_KEY, "sales", "list", query] as const,
};

export const listSales = (query: SalesListQuery) =>
  request(api.get<PaginatedSaleRowList>(ENDPOINTS.sales, { params: query }));

export const salesQuery = (query: SalesListQuery) =>
  queryOptions({
    queryKey: salesKeys.list(query),
    queryFn: () => listSales(query),
  });
