import type { RequestHandler } from "msw";

/**
 * Default handlers shared by every test. Deliberately empty: each suite
 * declares the traffic it cares about with `server.use(...)`, so a test can
 * never pass because of a handler it did not ask for.
 */
export const handlers: RequestHandler[] = [];
