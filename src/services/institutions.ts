import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import { createResourceKeys } from "@/services/queryKeys";
import type { components, operations } from "@/types/api";

export type Institution = components["schemas"]["Institution"];
export type InstitutionRequest = components["schemas"]["InstitutionRequest"];
export type InstitutionUpdate =
  components["schemas"]["PatchedInstitutionRequest"];

type PaginatedInstitutionList =
  components["schemas"]["PaginatedInstitutionList"];
type InstitutionCreateEnvelope =
  components["schemas"]["InstitutionCreateEnvelope"];
type InstitutionGetEnvelope = components["schemas"]["InstitutionGetEnvelope"];
type InstitutionPatchEnvelope =
  components["schemas"]["InstitutionPatchEnvelope"];
type InstitutionArchiveEnvelope =
  components["schemas"]["InstitutionArchiveEnvelope"];
type InstitutionUnarchiveEnvelope =
  components["schemas"]["InstitutionUnarchiveEnvelope"];

/**
 * The list's query parameters, taken from the operation rather than
 * hand-written so a parameter the schema does not declare cannot be sent —
 * and one it gains (ordering arrived this way) is picked up by regenerating.
 */
export type InstitutionListQuery = NonNullable<
  operations["api_institutions_list"]["parameters"]["query"]
>;

export const institutionKeys =
  createResourceKeys<InstitutionListQuery>("institutions");

export const listInstitutions = (query: InstitutionListQuery) =>
  request(
    api.get<PaginatedInstitutionList>(ENDPOINTS.institutions, {
      params: query,
    }),
  );

export const getInstitution = (id: string) =>
  request(api.get<InstitutionGetEnvelope>(ENDPOINTS.institution(id)));

export const createInstitution = (body: InstitutionRequest) =>
  request(api.post<InstitutionCreateEnvelope>(ENDPOINTS.institutions, body));

export const updateInstitution = (id: string, body: InstitutionUpdate) =>
  request(api.patch<InstitutionPatchEnvelope>(ENDPOINTS.institution(id), body));

/**
 * Archival is a POST to a dedicated sub-path, never a DELETE: the endpoint
 * answers with the updated resource, and restoring is a first-class action —
 * an archived row the UI could show but not restore would be a dead end.
 */
export const archiveInstitution = (id: string) =>
  request(
    api.post<InstitutionArchiveEnvelope>(ENDPOINTS.institutionArchive(id)),
  );

export const unarchiveInstitution = (id: string) =>
  request(
    api.post<InstitutionUnarchiveEnvelope>(ENDPOINTS.institutionUnarchive(id)),
  );

/**
 * One definition shared by the edit route's loader and the form, so the two
 * cannot disagree about staleness — the reason `profileQuery` is shared by
 * its loader and screen.
 */
export const institutionQuery = (id: string) =>
  queryOptions({
    queryKey: institutionKeys.detail(id),
    queryFn: () => getInstitution(id),
  });
