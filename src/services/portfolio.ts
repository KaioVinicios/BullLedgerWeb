import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components } from "@/types/api";

/**
 * The read-only projections — overview, allocation, and holding detail.
 *
 * Two of these three arrived before the phase that owns them. Phase 6 needed
 * the holding detail to make an exit's lot picker honest (`/api/lots/` knows a
 * lot's label and nothing else, while this carries each lot's `status` and how
 * much of it remains, so an insolvent lot can be unofferable rather than merely
 * rejected), and Phase 7 needed the overview's `missing[]`. Phase 8 has now
 * built the screens all three feed.
 *
 * Everything here is keyed under `PORTFOLIO_KEY`, so every ledger write, price
 * write, and reporting-currency change already invalidates it with no separate
 * rule — see `queryKeys.ts`, which states that rule once for the whole app.
 */
export type HoldingDetail = components["schemas"]["HoldingDetail"];
export type LotProjection = components["schemas"]["LotProjection"];

type HoldingDetailEnvelope = components["schemas"]["HoldingDetailEnvelope"];

export const getHolding = (accountId: string, assetId: string) =>
  request(
    api.get<HoldingDetailEnvelope>(ENDPOINTS.holding(accountId, assetId)),
  );

export const holdingQuery = (accountId: string, assetId: string) =>
  queryOptions({
    queryKey: [...PORTFOLIO_KEY, "holding", accountId, assetId] as const,
    queryFn: () => getHolding(accountId, assetId),
  });

/**
 * The portfolio rollup — the whole dashboard in one response.
 *
 * It carries more than its name suggests: the total and free cash, the nominal
 * and real returns, the by-account groups *with their holding rows*, the
 * by-archetype slices, and `missing[]`. The overview screen is therefore one
 * request rather than three, and the holding rows here are the only route to a
 * holding detail — the API publishes no holdings-list endpoint.
 *
 * `missing[]` is also the only place the API says *which* holdings could not be
 * valued and *why* (`NO_QUOTE` / `NO_FX`), which is what Phase 7 pulled this
 * read forward for. Deriving it from the asset list would answer the wrong
 * question: what assets exist, rather than what positions need valuing.
 *
 * `on` is not sent. It defaults to today, which is the only valuation date the
 * v1 screens have a reason to ask about.
 */
export type PortfolioOverview = components["schemas"]["PortfolioOverview"];
export type MissingFigure = components["schemas"]["MissingFigure"];
export type AccountGroup = components["schemas"]["AccountGroup"];
export type HoldingSummary = components["schemas"]["HoldingSummary"];
export type ArchetypeSlice = components["schemas"]["ArchetypeSlice"];

type PortfolioOverviewEnvelope =
  components["schemas"]["PortfolioOverviewEnvelope"];

export const getOverview = () =>
  request(api.get<PortfolioOverviewEnvelope>(ENDPOINTS.portfolioOverview));

export const overviewQuery = () =>
  queryOptions({
    queryKey: [...PORTFOLIO_KEY, "overview"] as const,
    queryFn: getOverview,
  });

/**
 * The allocation breakdowns.
 *
 * `by_archetype` deliberately duplicates the overview's own `archetypes[]`, in
 * a second shape — `AllocationSlice.key` is a bare string where
 * `ArchetypeSlice.archetype` is typed — so a screen reading both normalizes at
 * the call site. `by_currency` and `by_country` are the two dimensions that
 * exist nowhere else, and the reason this endpoint is read at all.
 *
 * `on` is not sent, for the reason the overview does not send it.
 */
export type PortfolioAllocation = components["schemas"]["PortfolioAllocation"];
export type AllocationSlice = components["schemas"]["AllocationSlice"];

type PortfolioAllocationEnvelope =
  components["schemas"]["PortfolioAllocationEnvelope"];

export const getAllocation = () =>
  request(api.get<PortfolioAllocationEnvelope>(ENDPOINTS.portfolioAllocation));

export const allocationQuery = () =>
  queryOptions({
    queryKey: [...PORTFOLIO_KEY, "allocation"] as const,
    queryFn: getAllocation,
  });
