import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Real translations, not the key-passthrough fallback: without init, `t()`
// echoes the key, and a test asserting on translated copy would pass because
// the key happens to contain the word it was looking for.
import "@/i18n/config";
import { server } from "@/mocks/server";

// jsdom implements neither of these. `matchMedia` is not optional noise: the
// root layout renders sonner's <Toaster>, which calls it on mount, so without
// this every test that mounts the router crashes into the error boundary and
// navigation assertions fail for a reason that has nothing to do with routing.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// TanStack Router scrolls on navigation; jsdom logs a "Not implemented" error
// for every hop without it.
window.scrollTo = () => {};

// Radix primitives measure themselves on mount. Without this, any page
// rendering a Checkbox, Select, or Tooltip throws before its markup exists.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
