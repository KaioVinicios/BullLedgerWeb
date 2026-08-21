import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { PortfolioAllocation } from "@/services/portfolio";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });

const allocation: PortfolioAllocation = {
  on_date: "2026-08-03",
  reporting_currency: "BRL",
  total_value: BRL(48_235_000),
  complete: true,
  by_archetype: [
    {
      key: "EXCHANGE_SECURITY",
      value: BRL(21_410_000),
      weight: "0.444",
      complete: true,
    },
    {
      key: "FIXED_INCOME",
      value: BRL(26_825_000),
      weight: "0.556",
      complete: true,
    },
  ],
  by_currency: [
    { key: "BRL", value: BRL(48_235_000), weight: "1", complete: true },
  ],
  by_country: [
    { key: "BR", value: BRL(48_235_000), weight: "1", complete: true },
  ],
  // The fourth dimension this screen does not show — it belongs to the
  // overview's own by-asset block, and is present here only because the
  // response carries it.
  by_asset: [],
  missing: [],
};

function signedIn(data: PortfolioAllocation = allocation) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/allocation/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
  ];
}

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

  return { router, queryClient };
}

describe("the allocation screen", () => {
  it("names every slice and its share, so no category needs its colour", async () => {
    server.use(...signedIn());
    mount(PATHS.ALLOCATION);

    const row = await screen.findByRole("row", {
      name: new RegExp(app.enums.archetype.EXCHANGE_SECURITY),
    });

    // Formatted in the suite's active language (en), which is what pins these
    // strings — a BRL amount read by an English speaker, not a pt-BR one.
    expect(within(row).getByText("R$214,100.00")).toBeVisible();
    expect(within(row).getByText("44.4%")).toBeVisible();
  });

  it("reconciles to the portfolio total", async () => {
    server.use(...signedIn());
    mount(PATHS.ALLOCATION);

    const total = await screen.findByRole("row", {
      name: new RegExp(app.allocation.total),
    });

    expect(within(total).getByText("R$482,350.00")).toBeVisible();
  });

  it("switches dimension through the URL", async () => {
    server.use(...signedIn());
    const { router } = mount(PATHS.ALLOCATION);

    await screen.findByRole("row", {
      name: new RegExp(app.enums.archetype.EXCHANGE_SECURITY),
    });

    await userEvent.click(
      screen.getByRole("tab", { name: app.allocation.dimensions.currency }),
    );

    expect(router.state.location.search).toEqual({ dimension: "currency" });
  });

  it("names currencies and countries from Intl, not from the locale files", async () => {
    server.use(...signedIn());
    mount(`${PATHS.ALLOCATION}?dimension=country`);

    // `Intl.DisplayNames`, for the reason Phase 4 settled: fourteen
    // hand-translated names that could drift from what the app calls the same
    // things elsewhere.
    expect(await screen.findByRole("row", { name: /Brazil/ })).toBeVisible();
  });

  it("says the figures are complete rather than leaving silence", async () => {
    server.use(...signedIn());
    mount(PATHS.ALLOCATION);

    // Absence of a warning is not confirmation — the good path is said out
    // loud, exactly as the pricing coverage block does.
    expect(await screen.findByText(app.allocation.complete)).toBeVisible();
  });

  it("names what it could not value instead of implying nothing is missing", async () => {
    server.use(
      ...signedIn({
        ...allocation,
        complete: false,
        missing: [
          {
            account: "11111111-1111-4111-8111-111111111111",
            asset: "22222222-2222-4222-8222-222222222222",
            reason: "NO_QUOTE",
          },
        ],
      }),
    );
    mount(PATHS.ALLOCATION);

    // The count reaches the sentence, and the affirmative line is gone —
    // silence here would let the screen imply nothing is missing.
    expect(
      await screen.findByText(/1 holding could not be valued/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: app.allocation.seePricing }),
    ).toBeVisible();
    expect(screen.queryByText(app.allocation.complete)).not.toBeInTheDocument();
  });

  it("names the free-cash bucket, which is not an archetype", async () => {
    server.use(
      ...signedIn({
        ...allocation,
        by_archetype: [
          ...allocation.by_archetype,
          // Captured from a running API, not invented. `by_archetype` is not
          // the overview's `archetypes[]`: this endpoint adds a sixth bucket
          // for uninvested cash, and types `key` as a bare string — so without
          // a branch for it the screen renders the raw i18n key at the user.
          {
            key: "FREE_CASH",
            value: BRL(1_820_000),
            weight: "0.038",
            complete: true,
          },
        ],
      }),
    );
    mount(PATHS.ALLOCATION);

    expect(
      await screen.findByRole("row", {
        name: new RegExp(app.allocation.freeCash),
      }),
    ).toBeVisible();
    expect(screen.queryByText(/enums\.archetype/)).not.toBeInTheDocument();
  });

  it("offers no way to write anything", async () => {
    server.use(...signedIn());
    mount(PATHS.ALLOCATION);

    await screen.findByRole("row", {
      name: new RegExp(app.enums.archetype.EXCHANGE_SECURITY),
    });

    // A projection surface carries no create, edit, or archive affordance.
    // Scoped to the content region, which is what "surface" meant here: the
    // shell around it is allowed its own affordances, and since the record
    // shortcut landed in the sidebar an unscoped query reads them as this
    // screen's.
    const content = within(screen.getByRole("main"));

    for (const link of content.queryAllByRole("link")) {
      expect(link).not.toHaveAttribute("href", expect.stringMatching(/\/new$/));
    }
  });
});
