import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Real translations, not the key-passthrough fallback: without init, `t()`
// echoes the key, and a test asserting on translated copy would pass because
// the key happens to contain the word it was looking for.
import "@/i18n/config";
import { server } from "@/mocks/server";

// `onUnhandledRequest: "error"` makes an unmocked request a test failure
// rather than a silent real network call.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// React Testing Library auto-registers this only when Vitest runs with
// `globals: true`. This project uses explicit imports instead, so without an
// explicit cleanup the DOM accumulates across tests in a file and queries
// start matching leftovers from an earlier render.
afterEach(cleanup);
