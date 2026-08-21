import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import { MOVEMENT_TYPE_SPECS } from "@/mocks/movementTypes";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const page = <T,>(results: T[]) => ({
  status: 200,
  data: { count: results.length, next: null, previous: null, results },
});

/**
 * A ledger that has been used. Only the count is read here — the shortcut asks
 * "has anything been recorded", not what.
 */
const RECORDED = 1;

/**
 * `movements` is a parameter because the record shortcut is the one thing in
 * this shell whose presence depends on portfolio state: it waits for a first
 * recorded movement, so that `Overview/FirstRun` owns the guided path to that
 * one without a second call to action arguing with it.
 */
async function mountAt(path: string, movements = RECORDED) {
  server.use(
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    // What /app/ledger/new loads, plus the movements read the shortcut gates
    // itself on. Registered for every mount rather than only where they are
    // needed: an unrequested handler costs nothing, and the alternative is a
    // second mount helper that differs from this one in a way nobody reads.
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([])),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, () =>
      HttpResponse.json({
        status: 200,
        data: { count: movements, next: null, previous: null, results: [] },
      }),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () => HttpResponse.json(page([]))),
    http.get(`${TEST_API_URL}/api/movement-types/`, () =>
      HttpResponse.json({ status: 200, data: MOVEMENT_TYPE_SPECS }),
    ),
  );

  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return screen.findByRole("navigation", { name: app.sidebar.label });
}

describe("AppSidebar", () => {
  it("renders every navigable area", async () => {
    const nav = await mountAt(PATHS.APP);

    for (const label of Object.values(app.nav)) {
      expect(
        within(nav).getByRole("link", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("marks the current area, and only it", async () => {
    const nav = await mountAt(PATHS.ACCOUNTS);

    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(app.nav.accounts);
  });

  it("does not leave Overview current on a child route", async () => {
    // /app is a prefix of every screen, and activeOptions.exact defaults to
    // false — this is the regression that flag exists to prevent.
    const nav = await mountAt(PATHS.LEDGER);

    expect(
      within(nav).getByRole("link", { name: app.nav.overview }),
    ).not.toHaveAttribute("aria-current");
  });

  it("carries the record shortcut, outside the navigation landmark", async () => {
    const nav = await mountAt(PATHS.APP);

    const shortcut = await screen.findByRole("link", {
      name: app.ledger.record,
    });

    expect(shortcut).toHaveAttribute("href", PATHS.LEDGER_NEW);
    // A verb, not a place. Inside the landmark it would answer "where am I"
    // with something that is not a location, and `NAV_SECTIONS` would have to
    // grow a label key that does not belong in `app.nav`.
    expect(
      within(nav).queryByRole("link", { name: app.ledger.record }),
    ).toBeNull();
  });

  it("does not let the record shortcut claim the page it points at", async () => {
    await mountAt(PATHS.LEDGER_NEW);

    expect(
      await screen.findByRole("link", { name: app.ledger.record }),
    ).not.toHaveAttribute("aria-current");
  });

  it("withholds the record shortcut until the ledger has been used", async () => {
    // Overview/FirstRun owns the walk to the first movement and offers one
    // action at a time; a gold button in the sidebar saying something else
    // would be a second instruction competing with it.
    const nav = await mountAt(PATHS.APP, 0);

    // The nav renders from static config on the first pass, so its presence
    // does not prove the accounts read has landed — wait the absence out.
    expect(
      within(nav).getByRole("link", { name: app.nav.overview }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: app.ledger.record }),
      ).not.toBeInTheDocument();
    });
  });

  it.each([PATHS.APP, PATHS.ACCOUNTS, PATHS.HELP, PATHS.LEDGER_NEW])(
    "lets exactly one element in the whole shell claim %s as current",
    async (path) => {
      await mountAt(path);

      // Deliberately not scoped to the nav landmark: the assertion above is,
      // and that is precisely why it could not see the brand mark claiming
      // `aria-current` from the sidebar header. `Link` sets that attribute
      // whenever its target matches and spreads it last, so the brand — which
      // points at /app, a prefix of everything — is a plain anchor instead.
      const claiming = document.querySelectorAll("[aria-current='page']");

      expect(claiming).toHaveLength(1);
      expect(claiming[0]).toBeInstanceOf(HTMLAnchorElement);
    },
  );
});
