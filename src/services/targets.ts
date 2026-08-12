import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import type { TargetScope } from "@/schemas/apiEnums";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys, PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * Targets — stored user intent, and the only resource in the app whose read
 * value is a *verdict* rather than a fact.
 *
 * `Target` is a discriminated union over `scope` with three members, and they
 * do not carry the same fields: portfolio takes an archetype, account takes an
 * account and an archetype, holding takes an account and an asset and **no
 * archetype at all** — the asset already has one, and asking twice would leave
 * room to disagree.
 *
 * The update union is the more interesting shape. All three of its members are
 * structurally identical — `{ loss_limit_pct?, loss_limit_period?, steps? }` —
 * with no discriminator and none of the scope fields. That is the schema
 * stating that the mutable surface does not depend on the scope, and it is why
 * the edit screen renders the scope as a badge rather than a control.
 *
 * Status is never here. It is derived at read time onto `HoldingSummary` and
 * `HoldingDetail`, which is why writing a target has to invalidate the
 * projections — see `invalidateTargets`.
 */
export type Target = components["schemas"]["Target"];
export type TargetRequest = components["schemas"]["TargetRequest"];
export type TargetUpdate = components["schemas"]["PatchedTargetUpdateRequest"];
export type TargetStep = components["schemas"]["TargetStep"];
export type TargetStepRequest = components["schemas"]["TargetStepRequest"];
export type TargetStatusResult = components["schemas"]["TargetStatusResult"];
export type TargetSource = components["schemas"]["TargetSource"];

type PaginatedTargetList = components["schemas"]["PaginatedTargetList"];
type TargetCreateEnvelope = components["schemas"]["TargetCreateEnvelope"];
type TargetGetEnvelope = components["schemas"]["TargetGetEnvelope"];
type TargetPatchEnvelope = components["schemas"]["TargetPatchEnvelope"];
type TargetArchiveEnvelope = components["schemas"]["TargetArchiveEnvelope"];
type TargetUnarchiveEnvelope = components["schemas"]["TargetUnarchiveEnvelope"];

/**
 * From the operation, never hand-written. Note what it declares — and does
 * not: `include_archived`, `page`, and `scope`, but **no `ordering`** (so no
 * sortable column header is offered, the same rule the ledger and the pricing
 * list follow) and **no `account` / `asset` / `archetype`** (so an exact-scope
 * lookup is not one request — see `listAllTargetsInScope`).
 */
export type TargetListQuery = NonNullable<
  operations["api_targets_list"]["parameters"]["query"]
>;

export const targetKeys = createResourceKeys<TargetListQuery>("targets");

export const listTargets = (query: TargetListQuery) =>
  request(api.get<PaginatedTargetList>(ENDPOINTS.targets, { params: query }));

export const getTarget = (id: string) =>
  request(api.get<TargetGetEnvelope>(ENDPOINTS.target(id)));

export const createTarget = (body: TargetRequest) =>
  request(api.post<TargetCreateEnvelope>(ENDPOINTS.targets, body));

export const updateTarget = (id: string, body: TargetUpdate) =>
  request(api.patch<TargetPatchEnvelope>(ENDPOINTS.target(id), body));

export const archiveTarget = (id: string) =>
  request(api.post<TargetArchiveEnvelope>(ENDPOINTS.targetArchive(id)));

export const unarchiveTarget = (id: string) =>
  request(api.post<TargetUnarchiveEnvelope>(ENDPOINTS.targetUnarchive(id)));

/** Shared by the edit route's loader and the form; see `assetQuery`. */
export const targetQuery = (id: string) =>
  queryOptions({
    queryKey: targetKeys.detail(id),
    queryFn: () => getTarget(id),
  });

/**
 * Every target at one level, by walking the pages — archived rows included
 * only when asked.
 *
 * The create form needs to answer "does this exact scope already have a
 * target?" before it lets a submit through, and `/api/targets/` publishes no
 * `account`, `asset`, or `archetype` filter — so the question cannot be one
 * request. Reading page 1 and calling it done is the trap Phase 8 documented
 * on contribution limits, and here the failure is worse than a missing figure:
 * it is a doomed submit the form promised to prevent.
 *
 * Bounded on purpose. A target is authored intent, one per scope, so a level
 * holds as many rows as the user has holdings — not as many as they have
 * movements. The cost is paid on the create screen and nowhere else.
 * `docs/backend-requests/2026-08-04-targets.md` asks for the filters.
 *
 * Archived rows are excluded by default: an archived target does not occupy
 * a scope, so it must never count as one unless a caller says otherwise.
 */
export async function listAllTargetsInScope(
  scope: TargetScope,
  includeArchived = false,
): Promise<Target[]> {
  const rows: Target[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listTargets({
      scope,
      page,
      include_archived: includeArchived || undefined,
    });
    rows.push(...result.results);

    if (!result.next) return rows;
  }
}

/**
 * `includeArchived` is part of the key, not just the request: the create
 * form's collision check asks for live rows only — an archived target does not
 * occupy a scope — while the list screen's toggle asks for both, and the two
 * answers must not share a cache entry.
 */
export const targetsInScopeQuery = (
  scope: TargetScope,
  includeArchived = false,
) =>
  queryOptions({
    queryKey: [...targetKeys.all, "all", scope, includeArchived] as const,
    queryFn: () => listAllTargetsInScope(scope, includeArchived),
  });

/**
 * The resource root, plus the projections.
 *
 * A target changes no figure anywhere — it changes a **verdict**, which the
 * overview's rows and the holding detail render. A user who creates a target
 * and returns to the overview to find no status is looking at a cache bug that
 * reads as a server bug, so the sweep is coarse on purpose, exactly as
 * `invalidatePricing` is.
 */
export function invalidateTargets(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: targetKeys.all }),
    queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  ]).then(() => undefined);
}
