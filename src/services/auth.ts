import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/apiClient";
import { request } from "@/lib/request";
import { ENDPOINTS } from "@/services/endpoints";
import type { components } from "@/types/api";

export type CurrentUser = components["schemas"]["EmailUserDetails"];

export type EmailLoginRequest = components["schemas"]["EmailLoginRequest"];
export type EmailRegisterRequest =
  components["schemas"]["EmailRegisterRequest"];
export type SocialLoginRequest = components["schemas"]["SocialLoginRequest"];
export type VerifyEmailRequest = components["schemas"]["VerifyEmailRequest"];
export type ResendEmailVerificationRequest =
  components["schemas"]["ResendEmailVerificationRequest"];
export type SPAPasswordResetRequest =
  components["schemas"]["SPAPasswordResetRequest"];
export type SPAPasswordResetConfirmRequest =
  components["schemas"]["SPAPasswordResetConfirmRequest"];

type CookieJWT = components["schemas"]["CookieJWT"];
type EmailRegister = components["schemas"]["EmailRegister"];
type RestAuthDetail = components["schemas"]["RestAuthDetail"];
type SocialLogin = components["schemas"]["SocialLogin"];

/**
 * One key, because there is exactly one "who am I" resource. Auth status is
 * server state — a query to cache, never a boolean in a store.
 */
export const authKeys = {
  user: () => ["auth", "user"] as const,
  /** Keyed by the emailed key, so one link is confirmed exactly once. */
  emailVerification: (key: string) => ["auth", "verify-email", key] as const,
};

export const getCurrentUser = () =>
  request(api.get<CurrentUser>(ENDPOINTS.authUser));

/**
 * The single definition of how the session is fetched, shared by the
 * `useCurrentUser` hook and both route guards. Sharing it is the point: two
 * call sites with their own options could disagree about retries or staleness
 * and produce a guard that admits someone the UI then treats as anonymous.
 *
 * `retry: false` is stated rather than inherited. The global predicate already
 * excludes `kind: "auth"`, but observing the 401 is this query's entire
 * purpose, so it is a decision here rather than an accident of the defaults.
 */
export const currentUserQuery = queryOptions({
  queryKey: authKeys.user(),
  queryFn: getCurrentUser,
  retry: false,
});

export const login = (body: EmailLoginRequest) =>
  request(api.post<CookieJWT>(ENDPOINTS.authLogin, body));

export const register = (body: EmailRegisterRequest) =>
  request(api.post<EmailRegister>(ENDPOINTS.authRegistration, body));

export const logout = () =>
  request(api.post<RestAuthDetail>(ENDPOINTS.authLogout));

export const googleLogin = (body: SocialLoginRequest) =>
  request(api.post<SocialLogin>(ENDPOINTS.authGoogle, body));

export const verifyEmail = (body: VerifyEmailRequest) =>
  request(api.post<RestAuthDetail>(ENDPOINTS.authVerifyEmail, body));

export const resendVerificationEmail = (body: ResendEmailVerificationRequest) =>
  request(api.post<RestAuthDetail>(ENDPOINTS.authResendEmail, body));

export const requestPasswordReset = (body: SPAPasswordResetRequest) =>
  request(api.post<RestAuthDetail>(ENDPOINTS.authPasswordReset, body));

export const confirmPasswordReset = (body: SPAPasswordResetConfirmRequest) =>
  request(api.post<RestAuthDetail>(ENDPOINTS.authPasswordResetConfirm, body));
