import axios, { type AxiosInstance } from "axios";

import { env } from "@/config/env";
import {
  REFRESH_PATH,
  attachSessionRecovery,
  notifySessionLost,
} from "@/lib/sessionRecovery";

/** Django's CSRF cookie. Deliberately not httpOnly, so axios can read it. */
export const CSRF_COOKIE = "csrftoken";
/** Django's CSRF header. Axios defaults to `X-XSRF-TOKEN`, which is wrong here. */
export const CSRF_HEADER = "X-CSRFToken";

/**
 * Builds an axios instance carrying every transport concern except session
 * recovery: cookies on every request, and the CSRF token echoed back from the
 * cookie axios reads for us.
 *
 * `withXSRFToken` is not redundant with `withCredentials`. Since axios 1.6.2
 * the CSRF header is attached to cross-origin requests only when it is set,
 * and this client is always cross-origin — the app talks to the API's real
 * origin in development, with no dev proxy. Without it the header would be
 * silently dropped on exactly the requests that need it.
 *
 * Sending the token is defensive: the OpenAPI schema documents no CSRF scheme
 * and no observed response sets the cookie, so axios sends the header when the
 * cookie exists and omits it when it does not. That is correct whether or not
 * the server enforces CSRF, and needs no change once the answer is confirmed.
 * See the open items in the Phase 1 design.
 */
export function createApiClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: CSRF_COOKIE,
    xsrfHeaderName: CSRF_HEADER,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * The application's client. A second, plain instance issues the refresh so
 * that call can never re-enter the interceptor that triggered it.
 */
export const api = createApiClient(env.VITE_API_URL);

const refreshClient = createApiClient(env.VITE_API_URL);

attachSessionRecovery(api, {
  refresh: () => refreshClient.post(REFRESH_PATH, {}),
  onSessionLost: notifySessionLost,
  csrfHeader: CSRF_HEADER,
});
