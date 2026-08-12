import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

/**
 * `Asset` and its request shapes are discriminated unions over `archetype` —
 * five members, one per archetype, each carrying that archetype's own field
 * set. The client never hand-writes a member; narrowing on `archetype` is how
 * a form reaches the right fields. Update requests are a separate union that
 * carries no `archetype` at all: the schema itself forbids changing it.
 */
export type Asset = components["schemas"]["Asset"];
export type AssetRequest = components["schemas"]["AssetRequest"];
export type AssetUpdate = components["schemas"]["PatchedAssetUpdateRequest"];
export type Archetype = components["schemas"]["ArchetypeEnum"];

type PaginatedAssetList = components["schemas"]["PaginatedAssetList"];
type AssetCreateEnvelope = components["schemas"]["AssetCreateEnvelope"];
type AssetGetEnvelope = components["schemas"]["AssetGetEnvelope"];
type AssetPatchEnvelope = components["schemas"]["AssetPatchEnvelope"];
type AssetArchiveEnvelope = components["schemas"]["AssetArchiveEnvelope"];
type AssetUnarchiveEnvelope = components["schemas"]["AssetUnarchiveEnvelope"];

/**
 * Taken from the operation rather than hand-written; this is where the
 * server-side `archetype` filter enters the client, and why filtering is
 * never done over a fetched page — the server owns the filtered `count`.
 */
export type AssetListQuery = NonNullable<
  operations["api_assets_list"]["parameters"]["query"]
>;

export const assetKeys = createResourceKeys<AssetListQuery>("assets");

export const listAssets = (query: AssetListQuery) =>
  request(api.get<PaginatedAssetList>(ENDPOINTS.assets, { params: query }));

/**
 * Every asset, archived ones included — a lookup table rather than a list.
 *
 * The same shape as `listAllTargetsInScope`, for a related reason: the targets
 * screen resolves an asset id to a name and to an archetype, and a page-1
 * answer would silently mis-resolve both the moment a user owns 51 assets. A
 * missing name shows a UUID; a missing archetype drops a shadow note, which
 * looks exactly like no conflict. Archived rows are in because a target can
 * name an archived asset and still has to be readable.
 */
export async function listAllAssets(): Promise<Asset[]> {
  const rows: Asset[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listAssets({ page, include_archived: true });
    rows.push(...result.results);

    if (!result.next) return rows;
  }
}

export const allAssetsQuery = queryOptions({
  queryKey: [...assetKeys.all, "all"] as const,
  queryFn: listAllAssets,
});

export const getAsset = (id: string) =>
  request(api.get<AssetGetEnvelope>(ENDPOINTS.asset(id)));

export const createAsset = (body: AssetRequest) =>
  request(api.post<AssetCreateEnvelope>(ENDPOINTS.assets, body));

export const updateAsset = (id: string, body: AssetUpdate) =>
  request(api.patch<AssetPatchEnvelope>(ENDPOINTS.asset(id), body));

export const archiveAsset = (id: string) =>
  request(api.post<AssetArchiveEnvelope>(ENDPOINTS.assetArchive(id)));

export const unarchiveAsset = (id: string) =>
  request(api.post<AssetUnarchiveEnvelope>(ENDPOINTS.assetUnarchive(id)));

/** Shared by the edit route's loader and the form; see `institutionQuery`. */
export const assetQuery = (id: string) =>
  queryOptions({
    queryKey: assetKeys.detail(id),
    queryFn: () => getAsset(id),
  });
