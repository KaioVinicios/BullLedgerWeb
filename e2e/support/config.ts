/**
 * The two origins a spec has to know about, and the one string operation that
 * turns a route pattern into a URL.
 *
 * The app's own origin is not here: Playwright already knows it as
 * `use.baseURL`, and a spec reads it from the `baseURL` fixture rather than
 * from a second copy that could drift.
 */

/**
 * Where the API is.
 *
 * Must match the `VITE_API_URL` the dev server booted with — the browser talks
 * to the API's real origin with no dev proxy, so a spec calling a different
 * one would be setting cookies the app never sees. Kept as an explicit
 * constant rather than read from `.env`, because `.env` reaches Vite's build
 * and not this Node process.
 */
export const API_ORIGIN = process.env.E2E_API_URL ?? "http://localhost:8000";

export function apiUrl(endpoint: string): string {
  return `${API_ORIGIN}${endpoint}`;
}

/**
 * Fills a `PATHS` pattern in, so a spec can navigate to a parameterized route
 * without writing the URL out. `PATHS` uses TanStack's `$param` segments,
 * which the router fills from the `params` prop — outside React there is no
 * router to ask, so this does the same substitution.
 */
export function routeTo(
  pattern: string,
  params: Record<string, string> = {},
): string {
  return pattern.replace(/\$(\w+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Route "${pattern}" has no value for "$${name}".`);
    }
    return encodeURIComponent(value);
  });
}
