import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

export type Account = components["schemas"]["Account"];
export type AccountRequest = components["schemas"]["AccountRequest"];
export type AccountUpdate = components["schemas"]["PatchedAccountRequest"];

type PaginatedAccountList = components["schemas"]["PaginatedAccountList"];
type AccountCreateEnvelope = components["schemas"]["AccountCreateEnvelope"];
type AccountGetEnvelope = components["schemas"]["AccountGetEnvelope"];
type AccountPatchEnvelope = components["schemas"]["AccountPatchEnvelope"];
type AccountArchiveEnvelope = components["schemas"]["AccountArchiveEnvelope"];
type AccountUnarchiveEnvelope =
  components["schemas"]["AccountUnarchiveEnvelope"];

/**
 * Taken from the operation rather than hand-written so a parameter the
 * schema does not declare cannot be sent, and one it gains is picked up by
 * regenerating types.
 */
export type AccountListQuery = NonNullable<
  operations["api_accounts_list"]["parameters"]["query"]
>;

export const accountKeys = createResourceKeys<AccountListQuery>("accounts");

/**
 * Accounts is the worked example for the whole service convention: it is the
 * simplest flat resource that still exercises pagination, a boolean filter,
 * an envelope on read, and an envelope on create with field-level errors.
 * Later phases follow this shape; Phase 1 deliberately does not write the
 * services those phases will design.
 *
 * The response type is named from the schema on every call. That is the one
 * piece of safety axios cannot infer for us, so it is stated rather than
 * assumed — and `request` unwraps the envelope the name declares.
 */
export const listAccounts = (query: AccountListQuery) =>
  request(api.get<PaginatedAccountList>(ENDPOINTS.accounts, { params: query }));

/** Every account, archived ones included. See `listAllAssets`. */
export async function listAllAccounts(): Promise<Account[]> {
  const rows: Account[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listAccounts({ page, include_archived: true });
    rows.push(...result.results);

    if (!result.next) return rows;
  }
}

export const allAccountsQuery = queryOptions({
  queryKey: [...accountKeys.all, "all"] as const,
  queryFn: listAllAccounts,
});

export const createAccount = (body: AccountRequest) =>
  request(api.post<AccountCreateEnvelope>(ENDPOINTS.accounts, body));

export const getAccount = (id: string) =>
  request(api.get<AccountGetEnvelope>(ENDPOINTS.account(id)));

export const updateAccount = (id: string, body: AccountUpdate) =>
  request(api.patch<AccountPatchEnvelope>(ENDPOINTS.account(id), body));

/**
 * Archival is a POST to a dedicated sub-path, never a DELETE: the endpoint
 * answers with the updated resource, and restoring is a first-class action.
 */
export const archiveAccount = (id: string) =>
  request(api.post<AccountArchiveEnvelope>(ENDPOINTS.accountArchive(id)));

export const unarchiveAccount = (id: string) =>
  request(api.post<AccountUnarchiveEnvelope>(ENDPOINTS.accountUnarchive(id)));

/** Shared by the edit route's loader and the form; see `institutionQuery`. */
export const accountQuery = (id: string) =>
  queryOptions({
    queryKey: accountKeys.detail(id),
    queryFn: () => getAccount(id),
  });
