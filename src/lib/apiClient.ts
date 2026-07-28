import axios, { type AxiosInstance } from "axios";

import { env } from "@/config/env";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  CSRF_PATH,
  attachCsrfAcquisition,
  createCsrfAcquisition,
} from "@/lib/csrf";
import {
  REFRESH_PATH,
  attachSessionRecovery,
  notifySessionLost,
} from "@/lib/sessionRecovery";

export { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf";

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
 * The API enforces CSRF on every cookie-authenticated unsafe request, so the
 * header is a requirement rather than a courtesy. Acquiring the cookie it is
 * read from is `@/lib/csrf`'s job.
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

/** The application's client — every feature call goes through this one. */
export const api = createApiClient(env.VITE_API_URL);

/**
 * A second instance for the two calls that keep the session alive: the refresh
 * and the CSRF acquisition. Neither may run through `api`'s recovery
 * interceptor — that is what makes recursion structurally impossible rather
 * than merely guarded against.
 */
const sessionClient = createApiClient(env.VITE_API_URL);

/**
 * The app's CSRF token acquisition: called once at startup (see `main.tsx`)
 * and awaited again before every unsafe request.
 */
export const ensureCsrfToken = createCsrfAcquisition(() =>
  sessionClient.get(CSRF_PATH),
);

// Both instances, because refresh is itself a cookie-authenticated POST the
// API refuses without a token. The acquisition's own GET is a safe method, so
// it passes through its interceptor untouched and cannot await itself.
attachCsrfAcquisition(api, ensureCsrfToken);
attachCsrfAcquisition(sessionClient, ensureCsrfToken);

attachSessionRecovery(api, {
  refresh: () => sessionClient.post(REFRESH_PATH, {}),
  onSessionLost: notifySessionLost,
  csrfHeader: CSRF_HEADER,
});
