import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components } from "@/types/api";

/**
 * The read-only projections. Phase 8 builds the screens; Phase 6 needs exactly
 * one read from here, and pulls it forward deliberately.
 *
 * The holding detail is what makes an exit's lot picker honest: `/api/lots/`
 * knows a lot's label and nothing else, while this carries each lot's `status`
 * and how much of it remains — so an insolvent lot can be unofferable rather
 * than merely rejected, and the remainder can be shown in the option itself.
 *
 * Keyed under `PORTFOLIO_KEY`, so every ledger write already invalidates it
 * through `invalidateLedger` with no separate rule.
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
