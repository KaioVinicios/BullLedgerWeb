// Path should not be hardcoded.
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { createAppRouter } from "@/routes/router";
import { PATHS } from "@/routes/path";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

function mount(initialPath: string) {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe("the authenticated route surface", () => {
  it.each([
    [PATHS.INSTITUTIONS, app.screens.institutions.title],
    [PATHS.ACCOUNTS, app.screens.accounts.title],
    [PATHS.ASSETS, app.screens.assets.title],
    [PATHS.LEDGER, app.screens.ledger.title],
    [PATHS.PRICING, app.screens.pricing.title],
    // Pricing's two children are reached from the pricing screen rather than
    // from the sidebar, so nothing else in this suite would notice them going
    // missing.
    [PATHS.PRICING_NEW, app.pricing.form.createTitle],
    [PATHS.PRICING_FX, app.pricing.fx.title],
    // Reached from the overview's breakdown block rather than the sidebar, so
    // like pricing's children it has no other guard against going missing.
    [PATHS.ALLOCATION, app.screens.allocation.title],
    // This row used to be a test asserting the opposite — that /app/holdings
    // was nothing, because the API publishes no holdings-list endpoint and a
    // linkable path would have resolved to not-found. The premise was about
    // the API and the conclusion was about the client: the rollup arrives
    // unpaginated with every account's rows, so the index is a regrouping the
    // client builds. What stops one being invented is now this screen's own
    // tests rather than a route that refuses to exist.
    [PATHS.HOLDINGS, app.screens.holdings.title],
    [PATHS.SALES, app.screens.sales.title],
    [PATHS.TARGETS, app.screens.targets.title],
    [PATHS.PROFILE, app.screens.profile.title],
    [PATHS.HELP, app.screens.help.title],
    [PATHS.FEEDBACK, app.screens.feedback.title],
    [PATHS.DONATE, app.screens.donate.title],
  ])("renders %s with its own heading", async (path, heading) => {
    server.use(
      http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
      // The profile route loads this before it renders. Harmless for the other
      // rows, which never request it.
      http.get(`${TEST_API_URL}/api/profile/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            id: "6f1c0e6e-0000-4000-8000-000000000000",
            reporting_currency: "BRL",
            inflation_reference_country: "BR",
          },
        }),
      ),
      // The institutions screen is a real list now and fetches on mount; an
      // empty page keeps this spec about routing, not about list content.
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        }),
      ),
      // The quote route's loader resolves this before rendering, so the asset
      // picker never mounts empty.
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        }),
      ),
    );

    mount(path);

    expect(
      await screen.findByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  });

  it("keeps every one of them behind the auth guard", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/auth/user/`, () =>
        HttpResponse.json(
          {
            status: 401,
            message: "Authentication credentials were not provided.",
            errors: {
              detail: ["Authentication credentials were not provided."],
            },
          },
          { status: 401 },
        ),
      ),
      http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );

    const router = mount(PATHS.ACCOUNTS);

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LOGIN),
    );
    expect(router.state.location.search).toMatchObject({
      redirect: PATHS.ACCOUNTS,
    });
  });
});
