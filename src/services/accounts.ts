import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components } from "@/types/api";

export type Account = components["schemas"]["Account"];
export type AccountRequest = components["schemas"]["AccountRequest"];

type PaginatedAccountList = components["schemas"]["PaginatedAccountList"];
type AccountCreateEnvelope = components["schemas"]["AccountCreateEnvelope"];

export interface AccountListQuery {
  page?: number;
  include_archived?: boolean;
}

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

export const createAccount = (body: AccountRequest) =>
  request(api.post<AccountCreateEnvelope>(ENDPOINTS.accounts, body));
