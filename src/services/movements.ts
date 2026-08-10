import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { isTransferType } from "@/schemas/movementSpec";
import { ENDPOINTS } from "@/services/endpoints";
import { lotKeys } from "@/services/lots";
import { createResourceKeys, PORTFOLIO_KEY } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * The ledger's write surface.
 *
 * There is no `updateMovement` and no `deleteMovement`, and that is the
 * schema's decision rather than an omission: `/api/movements/{id}/` is
 * GET-only. A movement is an immutable fact, so correcting one means `replace`
 * — which voids the original and records a successor linked through `replaces`
 * — and removing one means `void`, a soft delete the projections stop counting
 * while the history survives.
 *
 * Transfers do not go through `recordMovement` at all: `POST /api/movements/`
 * rejects `TRANSFER_IN`/`TRANSFER_OUT` outright, because a transfer is two legs
 * written atomically and paired.
 */
export type Movement = components["schemas"]["Movement"];
export type MovementRecordRequest =
  components["schemas"]["MovementRecordRequest"];
export type TransferRequest = components["schemas"]["TransferRequest"];
export type TransferLegs = components["schemas"]["TransferLegs"];

type PaginatedMovementList = components["schemas"]["PaginatedMovementList"];
type MovementRecordEnvelope = components["schemas"]["MovementRecordEnvelope"];
type MovementGetEnvelope = components["schemas"]["MovementGetEnvelope"];
type MovementReplaceEnvelope = components["schemas"]["MovementReplaceEnvelope"];
type MovementVoidEnvelope = components["schemas"]["MovementVoidEnvelope"];
type TransferRecordEnvelope = components["schemas"]["TransferRecordEnvelope"];

/**
 * From the operation, never hand-written. Note what is absent: there is no
 * `ordering`. The server orders `-occurred_on, -created_at, -pk`, which is the
 * domain's own order, so the ledger offers no sortable headers.
 */
export type MovementListQuery = NonNullable<
  operations["api_movements_list"]["parameters"]["query"]
>;

export const movementKeys = createResourceKeys<MovementListQuery>("movements");

export const listMovements = (query: MovementListQuery) =>
  request(
    api.get<PaginatedMovementList>(ENDPOINTS.movements, { params: query }),
  );

export const getMovement = (id: string) =>
  request(api.get<MovementGetEnvelope>(ENDPOINTS.movement(id)));

export const recordMovement = (body: MovementRecordRequest) =>
  request(api.post<MovementRecordEnvelope>(ENDPOINTS.movements, body));

export const replaceMovement = (id: string, body: MovementRecordRequest) =>
  request(
    api.post<MovementReplaceEnvelope>(ENDPOINTS.movementReplace(id), body),
  );

export const voidMovement = (id: string) =>
  request(api.post<MovementVoidEnvelope>(ENDPOINTS.movementVoid(id)));

export const recordTransfer = (body: TransferRequest) =>
  request(api.post<TransferRecordEnvelope>(ENDPOINTS.movementTransfer, body));

/**
 * Whether this row is one leg of a transfer.
 *
 * `transfer_of` alone is not the answer, and the Phase 6 live walk is what
 * found it: the API points the **in** leg at the out leg and leaves the out
 * leg's own field null, so the pairing is one-directional. Reading it as
 * "is this a leg?" made the departing half render as an ordinary movement —
 * unlabelled in the list, and offering a correction the server refuses with
 * `movement_transfer_not_replaceable`. The type is what both legs always
 * carry, so the type is what this asks.
 */
export function isTransferLeg(movement: Movement): boolean {
  return movement.transfer_of !== null || isTransferType(movement.type);
}

/** Shared by the correct route's loader and the form; see `assetQuery`. */
export const movementQuery = (id: string) =>
  queryOptions({
    queryKey: movementKeys.detail(id),
    queryFn: () => getMovement(id),
  });

/**
 * Every movement for one holding, pages and all.
 *
 * The holdings screen needs each lot's opening row — its `occurred_on` and
 * `unit_price` — and neither the lot resource nor the projection publishes
 * them. `PAGE_SIZE` is 50 with no client override, so a position held for years
 * outruns a single page, and the oldest lots are the first casualty of reading
 * only the first one.
 *
 * Bounded by the position rather than by the portfolio: both filters are sent,
 * so this walks one holding's history and not the whole ledger. It is issued on
 * expanding a row, never on load — see `InstanceRows`.
 *
 * The same shape as `listAllTargetsInScope`, for the same reason: the endpoint
 * pages and the caller needs the set.
 */
export async function listAllMovementsFor(
  account: string,
  asset: string,
): Promise<Movement[]> {
  const rows: Movement[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listMovements({ account, asset, page });
    rows.push(...result.results);

    if (!result.next) return rows;
  }
}

export const movementsForHoldingQuery = (account: string, asset: string) =>
  queryOptions({
    queryKey: [...movementKeys.all, "for-holding", account, asset] as const,
    queryFn: () => listAllMovementsFor(account, asset),
  });

/**
 * What every ledger write invalidates, in one place because it is one rule.
 *
 * Coarse on purpose, and the coarseness is the point: a recorded movement can
 * move a lot's remainder, a holding's basis, and the portfolio's total at once,
 * and the client is not allowed to reason about which. `queryKeys.ts` already
 * states this — a stale total is a correctness bug, an extra refetch is not.
 */
export function invalidateLedger(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: movementKeys.all }),
    queryClient.invalidateQueries({ queryKey: lotKeys.all }),
    queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  ]).then(() => undefined);
}
