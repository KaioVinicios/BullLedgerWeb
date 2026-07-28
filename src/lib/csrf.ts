import type { AxiosInstance } from "axios";

/** Django's CSRF cookie. Deliberately not httpOnly, so the client can read it. */
export const CSRF_COOKIE = "csrftoken";
/** Django's CSRF header. Axios defaults to `X-XSRF-TOKEN`, which is wrong here. */
export const CSRF_HEADER = "X-CSRFToken";
/** The endpoint whose only job is to set the cookie. Answers 204. */
export const CSRF_PATH = "/api/auth/csrf/";

/** CSRF guards state changes; reads never carry a token. */
const SAFE_METHODS = new Set(["get", "head", "options"]);

/** Whether the browser is already holding a CSRF token. */
export function hasCsrfToken(): boolean {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trimStart().startsWith(`${CSRF_COOKIE}=`));
}

/**
 * Builds the app's "make sure we have a CSRF token" step.
 *
 * The API authenticates by cookie, so it rejects an unsafe request that does
 * not echo the token — and nothing hands the token out implicitly: Django only
 * sets `csrftoken` when a view asks it to, and no other endpoint does. So the
 * SPA has to ask, once, before its first write.
 *
 * Concurrent callers share one request: a screen that fires three mutations at
 * once must not open three acquisitions, and the cookie is what they are all
 * waiting for. A failed acquisition is not remembered — the next caller tries
 * again rather than inheriting a dead promise.
 *
 * `acquire` is injected rather than imported so this module stays independent
 * of the client it protects; `apiClient` wires the two together.
 */
export function createCsrfAcquisition(
  acquire: () => Promise<unknown>,
): () => Promise<void> {
  let inFlight: Promise<void> | null = null;

  return function ensureCsrfToken(): Promise<void> {
    if (hasCsrfToken()) return Promise.resolve();

    inFlight ??= acquire()
      .then(() => undefined)
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}

/**
 * Applies the CSRF policy to an axios instance: unsafe requests wait for a
 * token and carry it, safe requests do neither.
 *
 * Startup already kicks the acquisition off, but a request must never depend
 * on having won that race — the interceptor is what turns "usually there" into
 * "always there". Axios resolves the cookie into the header inside its
 * adapter, after request interceptors have run, so awaiting here is early
 * enough for the token to ride along, and switching `withXSRFToken` off here
 * is what keeps it off a read: axios would otherwise attach the header to
 * every request, putting the token in logs and proxies that never needed it.
 */
export function attachCsrfAcquisition(
  instance: AxiosInstance,
  ensureCsrfToken: () => Promise<void>,
): void {
  instance.interceptors.request.use(async (config) => {
    if (SAFE_METHODS.has((config.method ?? "get").toLowerCase())) {
      config.withXSRFToken = false;
      return config;
    }

    await ensureCsrfToken();
    return config;
  });
}
