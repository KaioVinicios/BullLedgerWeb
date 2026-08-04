import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import type { Registration } from "@/schemas/apiEnums";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * Yearly contribution limits by registration — read-only reference data.
 *
 * Keyed under its own root rather than `PORTFOLIO_KEY`, and deliberately: no
 * user mutation can change this table, so nothing should invalidate it and it
 * must not sit under a root that `invalidateLedger` sweeps. That is the
 * reasoning `movementTypes.ts` already applies. Unlike that table this one is
 * paginated and listable, so it keeps the ordinary key factory — with the same
 * `staleTime: Infinity`, because a yearly data load is not a per-session event.
 */
export type ContributionLimit = components["schemas"]["ContributionLimit"];

type PaginatedContributionLimitList =
  components["schemas"]["PaginatedContributionLimitList"];

/**
 * From the operation, never hand-written. Note what is absent: **no
 * `registration` and no `year`.** The holding detail needs exactly one row and
 * can only ask for a page — see
 * `docs/backend-requests/2026-08-03-reporting.md`.
 *
 * A client-side filter is not the answer, for the reason Phase 5 settled:
 * filtering a paginated list in the client lies the moment a second page
 * exists, because the rows drop out and `count` does not.
 */
export type ContributionLimitListQuery = NonNullable<
  operations["api_contribution_limits_list"]["parameters"]["query"]
>;

export const contributionLimitKeys =
  createResourceKeys<ContributionLimitListQuery>("contributionLimits");

export const listContributionLimits = (query: ContributionLimitListQuery) =>
  request(
    api.get<PaginatedContributionLimitList>(ENDPOINTS.contributionLimits, {
      params: query,
    }),
  );

export const contributionLimitsQuery = (query: ContributionLimitListQuery) =>
  queryOptions({
    queryKey: contributionLimitKeys.list(query),
    queryFn: () => listContributionLimits(query),
    staleTime: Infinity,
  });

/**
 * The single-row lookup the holding detail needs.
 *
 * Takes rows already fetched rather than fetching, because the caller has page
 * 1 in hand and there is no parameter to ask the server for one row. Returns
 * `undefined` rather than a nearest match: a limit for the wrong year is worse
 * than no limit at all, and the tax block renders without it.
 */
export function findLimit(
  rows: readonly ContributionLimit[],
  registration: Registration,
  year: number,
): ContributionLimit | undefined {
  return rows.find(
    (row) => row.registration === registration && row.year === year,
  );
}
