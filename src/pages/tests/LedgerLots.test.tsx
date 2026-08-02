import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
import type { HoldingDetail } from "@/services/portfolio";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const account: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Corretora",
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

const security: Asset = {
  id: "22222222-2222-4222-8222-222222222222",
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

function pair(amount: number) {
  return {
    native: { amount, currency: "BRL" as const },
    base: { amount, currency: "BRL" as const },
  };
}

const holding: HoldingDetail = {
  account: account.id,
  asset: security.id,
  archetype: "EXCHANGE_SECURITY",
  on_date: "2026-03-04",
  holding_start: "2026-01-10",
  holding_period_days: 54,
  registration: "BR_TAXABLE",
  tax_advantaged: false,
  reporting_currency: "BRL",
  quantity: "17",
  principal: pair(100_000),
  current_value: pair(120_000),
  cost_basis_remaining: pair(100_000),
  invested: pair(100_000),
  realized_gain: pair(0),
  unrealized_gain: pair(20_000),
  income_received: pair(0),
  costs: pair(0),
  total_return: "0.2",
  reporting: {
    value: { amount: 120_000, currency: "BRL" },
    invested: { amount: 100_000, currency: "BRL" },
    realized_gain: { amount: 0, currency: "BRL" },
    unrealized_gain: { amount: 20_000, currency: "BRL" },
    income_received: { amount: 0, currency: "BRL" },
  },
  real_return: null,
  target: null,
  lots: [
    {
      lot: "33333333-3333-4333-8333-333333333333",
      label: "Lot — 2026-01-10",
      status: "OPEN",
      quantity_remaining: "7",
      principal_remaining: null,
      invested: pair(100_000),
      income_attributed: pair(2_500),
      realized_gain: pair(1_500),
      unrealized_gain: pair(20_000),
      lot_return: "0.235",
    },
    {
      lot: "44444444-4444-4444-8444-444444444444",
      label: "Lot — 2025-08-02",
      status: "CLOSED",
      quantity_remaining: "0",
      principal_remaining: null,
      invested: pair(50_000),
      income_attributed: pair(0),
      realized_gain: pair(4_000),
      unrealized_gain: null,
      lot_return: "0.08",
    },
  ],
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function signedIn() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([security])),
    ),
    http.get(
      `${TEST_API_URL}/api/portfolio/holdings/${account.id}/${security.id}/`,
      () => HttpResponse.json({ status: 200, data: holding }),
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

const holdingUrl = `${PATHS.LEDGER_LOTS}?account=${account.id}&asset=${security.id}`;

describe("the lots view", () => {
  it("asks for a holding before it can show anything", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_LOTS);

    // A lot means nothing outside one holding, so the screen says which two
    // answers it needs rather than showing an empty table.
    expect(
      await screen.findByText(app.ledger.lotsScreen.selectHolding),
    ).toBeVisible();
  });

  it("renders each contribution's figures from the projection", async () => {
    server.use(...signedIn());
    mount(holdingUrl);

    expect(await screen.findByText("Lot — 2026-01-10")).toBeVisible();
    expect(screen.getByText("Lot — 2025-08-02")).toBeVisible();

    // Status is a word before it is a shade.
    expect(screen.getByText(app.ledger.lotsScreen.status.OPEN)).toBeVisible();
    expect(screen.getByText(app.ledger.lotsScreen.status.CLOSED)).toBeVisible();

    // Every figure read, never computed: the return arrives as the decimal
    // fraction 0.235 and is shown as a percentage without a division here.
    expect(screen.getByText("23.5%")).toBeVisible();
    expect(screen.getAllByText(/R\$\s?1,000\.00/).length).toBeGreaterThan(0);
  });

  it("offers no way to write", async () => {
    server.use(...signedIn());
    mount(holdingUrl);

    await screen.findByText("Lot — 2026-01-10");
    // The API can rename and archive a lot; this screen does neither.
    expect(
      screen.queryByRole("button", { name: /rename|archive/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(app.ledger.lotsScreen.readOnly)).toBeVisible();
  });

  it("survives a reload through the URL", async () => {
    server.use(...signedIn());
    const { router } = mount(holdingUrl);

    expect(await screen.findByText("Lot — 2026-01-10")).toBeVisible();
    expect(router.state.location.search).toMatchObject({
      account: account.id,
      asset: security.id,
    });
  });

  it("puts the chosen holding in the address bar", async () => {
    server.use(...signedIn());
    const { router } = mount(PATHS.LEDGER_LOTS);

    await userEvent.click(
      await screen.findByRole("combobox", {
        name: app.ledger.filters.account,
      }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Corretora" }),
    );

    expect(router.state.location.search).toMatchObject({ account: account.id });
  });
});
