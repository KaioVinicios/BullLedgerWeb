import { HttpResponse, http, type RequestHandler } from "msw";

import { CSRF_PATH } from "@/lib/csrf";

/** The token the mocked CSRF endpoint hands out, for tests that assert on it. */
export const TEST_CSRF_TOKEN = "test-csrf-token";

/**
 * Default handlers shared by every test. Deliberately near-empty: each suite
 * declares the traffic it cares about with `server.use(...)`, so a test can
 * never pass because of a handler it did not ask for.
 *
 * The one exception is CSRF acquisition, which is infrastructure rather than
 * domain traffic — the client acquires a token before every unsafe request, so
 * without this each suite would have to mock a call it never makes on purpose.
 */
export const handlers: RequestHandler[] = [
  http.get(`*${CSRF_PATH}`, () => {
    // The real payload is the cookie, not the body. jsdom keeps no cookie jar
    // for a cross-origin response, so the handler sets it the way the browser
    // would against the deployed origin pair.
    if (typeof document !== "undefined") {
      document.cookie = `csrftoken=${TEST_CSRF_TOKEN}`;
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
