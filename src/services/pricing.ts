import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys, PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * Prices and FX rates: the reference data every projection is read through.
 *
 * One module for both because the API treats them as one area (both under its
 * `Pricing` tag) and because the invalidation rule is one rule.
 *
 * Both tables are **insert-only**. A row is unique per `(asset, date)` and
 * `(base, quote, date)`; posting a second value for a date that already has
 * one is a 400, not an overwrite. "A manual entry is an override" means the
 * daily feed sync never updates an existing row — not that a client can revise
 * one already stored. So there is no update and no delete to expose.
 *
 * There is also no `createFxRate`, and that is the schema's decision rather
 * than an omission: the FX table is global to the API, so a manual rate is an
 * administrative correction and `POST /api/fx-rates/` answers **403** to
 * anyone who is not staff. The client cannot even ask whether it may —
 * `is_staff` appears nowhere in the schema. The override a user does have is
 * `fx_rate` on a movement, shipped in Phase 6: an explicit rate always wins,
 * is recorded verbatim on the row, and is never re-resolved.
 */
export type PriceQuote = components["schemas"]["PriceQuote"];
export type PriceQuoteRequest = components["schemas"]["PriceQuoteRequest"];
export type FxRate = components["schemas"]["FxRate"];
export type PriceSource = components["schemas"]["PriceSourceEnum"];

type PaginatedPriceQuoteList = components["schemas"]["PaginatedPriceQuoteList"];
type PriceQuoteCreateEnvelope =
  components["schemas"]["PriceQuoteCreateEnvelope"];
type PaginatedFxRateList = components["schemas"]["PaginatedFxRateList"];

/**
 * From the operations, never hand-written, so a parameter the schema does not
 * declare cannot be sent. Note what is absent from both: no `ordering`, and on
 * quotes no date range — the client filters by asset and pages, nothing more.
 *
 * The quote list is nonetheless served newest-first (verified 2026-08-02
 * against a running API), which is what lets an asset-filtered list read its
 * own latest quote off the first row. That ordering is behaviour rather than
 * contract — the schema documents it for `/api/fx-rates/` and not for this
 * one — so the handoff asks for it to be written down.
 */
export type PriceQuoteListQuery = NonNullable<
  operations["api_price_quotes_list"]["parameters"]["query"]
>;
export type FxRateListQuery = NonNullable<
  operations["api_fx_rates_list"]["parameters"]["query"]
>;

export const priceQuoteKeys =
  createResourceKeys<PriceQuoteListQuery>("priceQuotes");
export const fxRateKeys = createResourceKeys<FxRateListQuery>("fxRates");

export const listPriceQuotes = (query: PriceQuoteListQuery) =>
  request(
    api.get<PaginatedPriceQuoteList>(ENDPOINTS.priceQuotes, { params: query }),
  );

export const createPriceQuote = (body: PriceQuoteRequest) =>
  request(api.post<PriceQuoteCreateEnvelope>(ENDPOINTS.priceQuotes, body));

export const listFxRates = (query: FxRateListQuery) =>
  request(api.get<PaginatedFxRateList>(ENDPOINTS.fxRates, { params: query }));

/**
 * What recording a price invalidates, in one place because it is one rule.
 *
 * Coarse on purpose, exactly as `invalidateLedger` is: `queryKeys.ts` already
 * states the app-wide rule — any mutation to movements, price quotes, FX
 * rates, or the profile invalidates `PORTFOLIO_KEY` wholesale. A stale total
 * is a correctness bug; an extra refetch is not.
 */
export function invalidatePricing(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: priceQuoteKeys.all }),
    queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  ]).then(() => undefined);
}
