import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// `findBy*` waits 1s by default — enough alone, not with seventy files
// competing for the same cores. The screens are not slower; the machine is
// busier, and a timeout that measures load is a flake, not a signal.
//
// Raised from 4s during Phase 6, on measurement rather than suspicion: the
// full suite failed three runs in four, never twice on the same test, while
// every one of those files passed on its own and the whole suite passed under
// `--no-file-parallelism`. Aggregate test time was 78s parallel against 13s
// serial — six times the work per core, against a budget that had been sized
// for a smaller suite.
//
// This costs nothing when tests pass, because a passing query resolves as soon
// as its element appears; the number only decides how long a genuine failure
// takes to report. Ten seconds is chosen to survive a loaded CI runner with
// fewer cores than a laptop, which is where this would have bitten next.
configure({ asyncUtilTimeout: 10_000 });

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

// jsdom implements none of the pointer-capture API, and Radix's Select calls
// it from its pointer handlers — opening one in a test throws without these.
// scrollIntoView is the same story when the opened list positions itself.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

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
