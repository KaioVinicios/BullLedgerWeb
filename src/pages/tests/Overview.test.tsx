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
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { PortfolioOverview } from "@/services/portfolio";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const PETR_ID = "22222222-2222-4222-8222-222222222222";
const HASH_ID = "33333333-3333-4333-8333-333333333333";

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });

const account: Account = {
  id: ACCOUNT_ID,
  name: "Corretora XP",
  institution: null,
  country: "BR",
  registration: "BR_TAXABLE",
  base_currency: "BRL",
  account_number: "",
  contribution_room: null,
  plan_type: null,
  deductible: null,
  tax_regime: null,
  taxed_on: null,
  archived_at: null,
};

const petr: Asset = {
  id: PETR_ID,
  name: "PETR4",
  archetype: "EXCHANGE_SECURITY",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  ticker: "PETR4",
  exchange: "B3",
  security_type: "STOCK",
  pays_distributions: true,
};

const hash: Asset = { ...petr, id: HASH_ID, name: "HASH11", ticker: "HASH11" };

const overview: PortfolioOverview = {
  on_date: "2026-08-03",
  reporting_currency: "BRL",
  total_value: BRL(48_235_000),
  free_cash: BRL(1_820_000),
  complete: false,
  accounts: [
    {
      account: ACCOUNT_ID,
      cash: BRL(1_200_000),
      subtotal: BRL(29_140_000),
      complete: false,
      holdings: [
        {
          account: ACCOUNT_ID,
          asset: PETR_ID,
          archetype: "EXCHANGE_SECURITY",
          quantity: "100",
          principal_native: null,
          current_value_native: BRL(21_410_000),
          value: BRL(21_410_000),
          invested: BRL(19_780_000),
          realized_gain: BRL(0),
          unrealized_gain: BRL(1_630_000),
          income_received: BRL(48_800),
          total_return: "0.082",
          complete: true,
          target_status: null,
        },
        {
          account: ACCOUNT_ID,
          asset: HASH_ID,
          archetype: "EXCHANGE_SECURITY",
          quantity: "50",
          principal_native: null,
          current_value_native: null,
          value: null,
          invested: BRL(5_000_000),
          realized_gain: BRL(0),
          unrealized_gain: null,
          income_received: BRL(0),
          total_return: null,
          complete: false,
          target_status: null,
        },
      ],
    },
  ],
  archetypes: [
    {
      archetype: "EXCHANGE_SECURITY",
      value: BRL(21_410_000),
      weight: "1",
      complete: false,
    },
  ],
  nominal_return: "0.124",
  real_return: "0.068",
  missing: [{ account: ACCOUNT_ID, asset: HASH_ID, reason: "NO_QUOTE" }],
};

function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

function signedIn(data: PortfolioOverview = overview) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([petr, hash])),
    ),
  ];
}

function mount(initialPath: string = PATHS.APP) {
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

/** An overview with nothing in it, plus counts for the four setup steps. */
function emptyPortfolio(counts: {
  institutions: number;
  accounts: number;
  assets: number;
  movements: number;
}) {
  const empty: PortfolioOverview = {
    ...overview,
    total_value: BRL(0),
    free_cash: BRL(0),
    complete: true,
    accounts: [],
    archetypes: [],
    nominal_return: null,
    real_return: null,
    missing: [],
  };

  const counted = (count: number) => ({
    status: 200,
    data: { count, next: null, previous: null, results: [] },
  });

  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data: empty }),
    ),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(counted(counts.institutions)),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(counted(counts.accounts)),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(counted(counts.assets)),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, () =>
      HttpResponse.json(counted(counts.movements)),
    ),
  ];
}

describe("first run", () => {
  it("names the next action rather than reporting an absence", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 0,
        accounts: 0,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByRole("link", {
        name: app.overview.firstRun.institution.action,
      }),
    ).toHaveAttribute("href", PATHS.INSTITUTIONS_NEW);
  });

  it("moves the call to action to the first step still undone", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 1,
        accounts: 1,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByRole("link", {
        name: app.overview.firstRun.asset.action,
      }),
    ).toHaveAttribute("href", PATHS.ASSETS_NEW);

    // Exactly one action: offering step four before step one is offering a
    // form that cannot be submitted.
    expect(
      screen.queryByRole("link", {
        name: app.overview.firstRun.institution.action,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: app.overview.firstRun.movement.action,
      }),
    ).not.toBeInTheDocument();
  });

  it("marks a finished step with a word, not only an icon", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 1,
        accounts: 0,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByText(app.overview.firstRun.institution.done),
    ).toBeVisible();
  });

  it("does not appear once there is anything to report", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByText("R$482,350.00");
    expect(
      screen.queryByText(app.overview.firstRun.title),
    ).not.toBeInTheDocument();
  });
});

describe("the overview screen", () => {
  it("leads with the total, then the returns", async () => {
    server.use(...signedIn());
    mount();

    expect(await screen.findByText("R$482,350.00")).toBeVisible();
    expect(screen.getByText("+12.4%")).toBeVisible();
    expect(screen.getByText("+6.8%")).toBeVisible();
    expect(screen.getByText("R$18,200.00")).toBeVisible();
  });

  it("groups holdings under their account with its cash and subtotal", async () => {
    server.use(...signedIn());
    mount();

    const group = await screen.findByRole("region", { name: /Corretora XP/ });

    expect(within(group).getByText("R$291,400.00")).toBeVisible();
    expect(within(group).getByText("R$12,000.00")).toBeVisible();
  });

  it("makes each holding row the way into its detail", async () => {
    server.use(...signedIn());
    mount();

    const link = await screen.findByRole("link", { name: /PETR4/ });

    expect(link).toHaveAttribute(
      "href",
      `/app/holdings/${ACCOUNT_ID}/${PETR_ID}`,
    );
  });

  it("says a holding has no price instead of rendering a zero", async () => {
    server.use(...signedIn());
    mount();

    const row = await screen.findByRole("row", { name: /HASH11/ });

    expect(
      within(row).getByText(app.enums.missingReason.NO_QUOTE),
    ).toBeVisible();
    expect(within(row).queryByText("R$0.00")).not.toBeInTheDocument();
  });

  it("collapses a group through the URL, so the state is shareable", async () => {
    server.use(...signedIn());
    const { router } = mount();

    await screen.findByRole("link", { name: /PETR4/ });

    await userEvent.click(screen.getByRole("button", { name: /Corretora XP/ }));

    expect(router.state.location.search).toEqual({ closed: [ACCOUNT_ID] });
    expect(
      screen.queryByRole("link", { name: /PETR4/ }),
    ).not.toBeInTheDocument();
  });

  it("restores a collapsed group from the address bar", async () => {
    server.use(...signedIn());
    mount(`${PATHS.APP}?closed=%5B%22${ACCOUNT_ID}%22%5D`);

    await screen.findByRole("button", { name: /Corretora XP/ });
    expect(
      screen.queryByRole("link", { name: /PETR4/ }),
    ).not.toBeInTheDocument();
  });

  it("points at the profile when real return has no inflation reference", async () => {
    server.use(...signedIn({ ...overview, real_return: null }));
    mount();

    // The figure is absent because of a setting the user controls, so the
    // screen names the setting rather than showing an em dash.
    expect(
      await screen.findByRole("link", { name: app.overview.setInflation }),
    ).toHaveAttribute("href", PATHS.PROFILE);
  });

  it("sends the other two dimensions to the allocation screen", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByRole("link", { name: app.overview.seeAllocation }),
    ).toHaveAttribute("href", PATHS.ALLOCATION);
  });

  it("offers no way to write anything", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByText("R$482,350.00");

    const main = screen.getByRole("main");
    for (const button of within(main).queryAllByRole("button")) {
      expect(button).not.toHaveAccessibleName(
        /new|add|edit|record|save|archive/i,
      );
    }
  });
});
