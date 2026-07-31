import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import type { components } from "@/types/api";

export type Profile = components["schemas"]["Profile"];
export type ProfileUpdate = components["schemas"]["PatchedProfileRequest"];

type ProfileGetEnvelope = components["schemas"]["ProfileGetEnvelope"];
type ProfilePatchEnvelope = components["schemas"]["ProfilePatchEnvelope"];

/**
 * A singleton resource: `/api/profile/` carries no id and always resolves to
 * the caller's own profile.
 *
 * `createResourceKeys` is deliberately not used — it would hand this a
 * `list()` and a `detail()` that can never be called, and a key factory whose
 * members are unreachable is a lie about the shape of the resource.
 */
export const profileKeys = {
  profile: () => ["profile"] as const,
};

export const getProfile = () =>
  request(api.get<ProfileGetEnvelope>(ENDPOINTS.profile));

export const updateProfile = (body: ProfileUpdate) =>
  request(api.patch<ProfilePatchEnvelope>(ENDPOINTS.profile, body));

/**
 * One definition shared by the route loader and the screen, for the reason
 * `currentUserQuery` is shared by the guards and the UI: two call sites with
 * their own options can disagree about staleness, and here that would mean a
 * form mounting with values the loader had already replaced.
 */
export const profileQuery = queryOptions({
  queryKey: profileKeys.profile(),
  queryFn: getProfile,
});
