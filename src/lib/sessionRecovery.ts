import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const REFRESH_PATH = "/api/auth/token/refresh/";

/**
 * Marks a config that has already been replayed after a refresh.
 *
 * Deliberately a string key, not a symbol. Replaying runs the config back
 * through `mergeConfig`, which enumerates with `Object.keys` — symbols are
 * dropped there, so a symbol flag would never reach the second attempt and
 * every retry would look like a first one: 401, refresh, retry, forever.
 * Unknown string options are carried through untouched and never reach the
 * wire, which is exactly what this needs.
 */
const RETRIED = "__blSessionRetried";

interface RecoverableConfig extends InternalAxiosRequestConfig {
  [RETRIED]?: boolean;
}

export interface SessionRecoveryOptions {
  /**
   * Issues the refresh call. Must not run through the instance being
   * recovered — that is what makes recursion structurally impossible rather
   * than merely guarded against.
   */
  refresh: () => Promise<unknown>;
  /** Called when a refresh fails and the session is gone for good. */
  onSessionLost: () => void;
  /** Header the CSRF token rides on; cleared before a replay when set. */
  csrfHeader?: string;
}

/**
 * Teaches an axios instance to recover from a 401: refresh once, replay the
 * original request, and give up loudly if the refresh itself fails.
 *
 * A response interceptor is the right seam because axios hands back the
 * original config — method, URL, params, and body all intact and re-usable.
 * Replaying is a single call, with none of the body-consumption care a
 * `fetch`-level implementation needs.
 */
export function attachSessionRecovery(
  instance: AxiosInstance,
  options: SessionRecoveryOptions,
): void {
  let inFlightRefresh: Promise<boolean> | null = null;

  /**
   * Runs at most one refresh at a time: a burst of 401s awaits the same
   * promise, so the server sees exactly one token rotation and every queued
   * request resumes after it.
   */
  function refreshOnce(): Promise<boolean> {
    inFlightRefresh ??= options
      .refresh()
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null;
      });

    return inFlightRefresh;
  }

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }

    const config = error.config as RecoverableConfig | undefined;

    // No config means the failure happened before a request was built, and a
    // config already flagged has had its one retry.
    if (!config || config[RETRIED]) throw error;

    if (!(await refreshOnce())) {
      options.onSessionLost();
      throw error;
    }

    config[RETRIED] = true;
    // Drop the token the first attempt carried: the refresh may have rotated
    // it, and axios only overwrites the header when a cookie is present.
    if (options.csrfHeader) config.headers.delete(options.csrfHeader);

    return instance(config);
  });
}

let sessionLostHandler: () => void = () => {};

/**
 * Registers what happens when the session is lost. Wired once at startup to
 * clear the query cache. This module must not import the query client — that
 * would invert the dependency and make it untestable without React — so
 * transport announces and the cache layer reacts.
 */
export function setOnSessionLost(handler: () => void): void {
  sessionLostHandler = handler;
}

export function notifySessionLost(): void {
  sessionLostHandler();
}
