import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import type { components } from "@/types/api";

/**
 * The server's own validation vocabulary for the ledger.
 *
 * This resource exists because the client asked for it: OpenAPI cannot express
 * an archetype × type matrix in its type system, so the API publishes the table
 * as data instead (`docs/backend-requests/2026-07-31-ledger-contract-and-docs.md`,
 * request 3). The client therefore derives the entry form from the server rather
 * than restating `apps/movements/specs.py` and hoping the two stay in step.
 *
 * It is static per deploy — it changes with a release, never with the user's
 * data — so it is fetched once per session and never refetched. That is what
 * `staleTime: Infinity` buys, and why this key is not under `PORTFOLIO_KEY`: no
 * mutation anywhere can invalidate it.
 *
 * It also does not go through `createResourceKeys`. That factory gives a
 * resource a `list(filters)` and a `detail(id)`; this one is a single
 * unpaginated read with neither, and inventing two uncallable functions for it
 * would be the same mistake `profile.ts` avoids.
 */
export type MovementTypeSpec = components["schemas"]["MovementTypeSpec"];
export type MovementShape = components["schemas"]["MovementShape"];

type MovementTypeSpecListEnvelope =
  components["schemas"]["MovementTypeSpecListEnvelope"];

export const MOVEMENT_TYPES_KEY = ["movement-types"] as const;

export const listMovementTypes = () =>
  request(api.get<MovementTypeSpecListEnvelope>(ENDPOINTS.movementTypes));

export const movementTypesQuery = queryOptions({
  queryKey: MOVEMENT_TYPES_KEY,
  queryFn: listMovementTypes,
  staleTime: Infinity,
  gcTime: Infinity,
});
