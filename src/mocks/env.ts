/**
 * The API origin every test runs against.
 *
 * One constant, two consumers that must agree: `vite.config.ts` feeds it to
 * `VITE_API_URL` so `src/config/env.ts` validates at import time, and MSW
 * handlers build their URLs from it. A handler whose origin drifts from the
 * client's stops matching, and `onUnhandledRequest: "error"` turns that into a
 * failing test with no obvious cause.
 *
 * The host resolves nowhere on purpose — `.local` is reserved for mDNS — so a
 * request that escapes MSW dies instead of reaching a real server.
 *
 * `vite.config.ts` imports this through a relative path, so the module must
 * stay dependency-free: the `@/` alias does not exist yet while the config
 * itself is being loaded.
 */
export const TEST_API_URL = "https://api.test.bullledger.local";
