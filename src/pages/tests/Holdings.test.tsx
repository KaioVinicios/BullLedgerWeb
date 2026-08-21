import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import explain from "@/i18n/locales/en/explain.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { Institution } from "@/services/institutions";
import type { PortfolioOverview } from "@/services/portfolio";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const XP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BROKER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PENSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const WALLET_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PETR_ID = "22222222-2222-4222-8222-222222222222";
const HASH_ID = "33333333-3333-4333-8333-333333333333";
const VALE_ID = "44444444-4444-4444-8444-444444444444";
const CDB_ID = "55555555-5555-4555-8555-555555555555";
const GOLD_ID = "66666666-6666-4666-8666-666666666666";

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });

const xp: Institution = {
  id: XP_ID,
  name: "XP Investimentos",
  kinds: ["BROKERAGE"],
  country: "BR",
  archived_at: null,
};

const anAccount = (
  id: string,
  name: string,
  institution: string | null,
  institutionName = "",
): Account => ({
  id,
  name,
  institution,
  institution_name: institutionName,
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
});

const broker = anAccount(BROKER_ID, "XP Corretora", XP_ID);
const pension = anAccount(PENSION_ID, "XP Previdência", XP_ID);
const wallet = anAccount(WALLET_ID, "Carteira física", null);

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
const vale: Asset = { ...petr, id: VALE_ID, name: "VALE3", ticker: "VALE3" };
// Named for what its holding row is, not for a second archetype: `Asset` is a
// discriminated union and a real FIXED_INCOME row would need ten more fields
// this screen never reads. The holding's own `archetype` is what matters here.
const cdb: Asset = { ...petr, id: CDB_ID, name: "CDB Banco X", ticker: "CDB" };
const gold: Asset = { ...petr, id: GOLD_ID, name: "Ouro", ticker: "GOLD" };

const holding = (
  account: string,
  asset: string,
  overrides: Record<string, unknown> = {},
) => ({
  account,
  asset,
  archetype: "EXCHANGE_SECURITY" as const,
  quantity: "10",
  cost_basis_remaining_native: BRL(100_000),
  current_value_native: BRL(120_000),
  value: BRL(120_000),
  invested: BRL(100_000),
  realized_gain: BRL(0),
  unrealized_gain: BRL(20_000),
  income_received: BRL(0),
  total_return: "0.2",
  complete: true,
  target_status: null,
  ...overrides,
});

/** Bought and sold in full: a row the rollup still reports, at zero. */
const closed = (account: string, asset: string) =>
  holding(account, asset, {
    quantity: "0",
    cost_basis_remaining_native: BRL(0),
    current_value_native: BRL(0),
    value: BRL(0),
    unrealized_gain: BRL(0),
  });

/** Held, but the server had no quote for it: unknown, not zero. */
const unvalued = (account: string, asset: string) =>
  holding(account, asset, {
    current_value_native: null,
    value: null,
    unrealized_gain: null,
    total_return: null,
    complete: false,
  });

const overview: PortfolioOverview = {
  on_date: "2026-08-07",
  reporting_currency: "BRL",
  total_value: BRL(3_060_000),
  free_cash: BRL(200_000),
  complete: false,
  accounts: [
    {
      account: BROKER_ID,
      cash: BRL(200_000),
      subtotal: BRL(1_540_000),
      complete: false,
      nominal_return: null,
      real_return: null,
      holdings: [
        holding(BROKER_ID, PETR_ID),
        unvalued(BROKER_ID, HASH_ID),
        closed(BROKER_ID, VALE_ID),
      ],
    },
    {
      account: PENSION_ID,
      cash: null,
      subtotal: BRL(1_000_000),
      complete: true,
      nominal_return: null,
      real_return: null,
      holdings: [
        holding(PENSION_ID, CDB_ID, {
          archetype: "FIXED_INCOME",
          quantity: null,
          cost_basis_remaining_native: BRL(1_000_000),
          current_value_native: BRL(1_000_000),
          value: BRL(1_000_000),
        }),
      ],
    },
    {
      account: WALLET_ID,
      cash: BRL(0),
      subtotal: BRL(520_000),
      complete: true,
      nominal_return: null,
      real_return: null,
      holdings: [holding(WALLET_ID, GOLD_ID)],
    },
  ],
  archetypes: [],
  nominal_return: "0.1",
  real_return: null,
  missing: [{ account: BROKER_ID, asset: HASH_ID, reason: "NO_QUOTE" }],
};

function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

const OPEN_LOT = "77777777-7777-4777-8777-777777777777";
const SHUT_LOT = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";

const PAIR = (amount: number) => ({ native: BRL(amount), base: BRL(amount) });

/** One position: a lot still held, and one sold out from under it. */
const holdingDetail = {
  account: BROKER_ID,
  asset: PETR_ID,
  archetype: "EXCHANGE_SECURITY",
  on_date: "2026-08-07",
  holding_start: "2026-03-04",
  holding_period_days: 156,
  registration: "BR_TAXABLE",
  tax_advantaged: null,
  reporting_currency: "BRL",
  quantity: "10",
  principal: null,
  current_value: PAIR(120_000),
  cost_basis_remaining: PAIR(100_000),
  invested: PAIR(100_000),
  realized_gain: PAIR(0),
  unrealized_gain: PAIR(20_000),
  income_received: PAIR(0),
  costs: PAIR(0),
  total_return: "0.2",
  reporting: {
    value: BRL(120_000),
    invested: BRL(100_000),
    realized_gain: BRL(0),
    unrealized_gain: BRL(20_000),
    income_received: BRL(0),
  },
  real_return: null,
  target: null,
  lots: [
    {
      lot: OPEN_LOT,
      label: "",
      status: "OPEN",
      quantity_remaining: "10",
      principal_remaining: null,
      invested: PAIR(100_000),
      income_attributed: PAIR(0),
      realized_gain: PAIR(0),
      unrealized_gain: PAIR(20_000),
      lot_return: "0.2",
    },
    {
      lot: SHUT_LOT,
      label: "",
      status: "CLOSED",
      quantity_remaining: "0",
      principal_remaining: null,
      invested: PAIR(62_000),
      income_attributed: PAIR(0),
      realized_gain: PAIR(8_000),
      unrealized_gain: PAIR(0),
      lot_return: "0.13",
    },
  ],
};

/** The entry rows the two lots were born from, at their own prices. */
const entryMovement = (id: string, lot: string, on: string, price: string) => ({
  id,
  account: BROKER_ID,
  asset: PETR_ID,
  lot,
  type: "BUY",
  occurred_on: on,
  quantity_delta: "10",
  unit_price: price,
  cash_delta: BRL(-20_000),
  fee: null,
  fx_rate: "1",
  note: "",
  replaces: null,
  transfer_of: null,
  created_at: `${on}T00:00:00Z`,
  voided_at: null,
});

const movementsForPetr = [
  entryMovement("mv-open", OPEN_LOT, "2026-03-04", "20.00"),
  entryMovement("mv-shut", SHUT_LOT, "2026-04-02", "31.00"),
];

/** Only the two fields `entryTypes` reads; the real table is larger. */
const movementTypes = [
  { type: "BUY", lot: "CREATES" },
  { type: "DEPOSIT", lot: "CREATES" },
  { type: "SELL", lot: "REQUIRES" },
];

function signedIn(data: PortfolioOverview = overview) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(page([xp])),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([broker, pension, wallet])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([petr, hash, vale, cdb, gold])),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, () =>
      HttpResponse.json(page(movementsForPetr)),
    ),
    http.get(`${TEST_API_URL}/api/movement-types/`, () =>
      HttpResponse.json({ status: 200, data: movementTypes }),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/holdings/:account/:asset/`, () =>
      HttpResponse.json({ status: 200, data: holdingDetail }),
    ),
  ];
}

function mount(initialPath: string = PATHS.HOLDINGS) {
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

describe("the holdings screen", () => {
  it("gathers an institution's accounts under it", async () => {
    server.use(...signedIn());
    mount();

    const group = await screen.findByRole("region", {
      name: /XP Investimentos/,
    });

    expect(within(group).getByText("XP Corretora")).toBeVisible();
    expect(within(group).getByText("XP Previdência")).toBeVisible();
  });

  it("lists an account's cash beside the holdings it totals", async () => {
    server.use(...signedIn());
    mount();

    const group = await screen.findByRole("region", { name: /XP Corretora/ });

    expect(within(group).getByText(app.holdings.cash)).toBeVisible();
  });

  it("does not list a position that has been sold down to nothing", async () => {
    server.use(...signedIn());
    mount();

    expect(await screen.findByText("PETR4")).toBeVisible();
    expect(screen.queryByText("VALE3")).not.toBeInTheDocument();
  });

  it("names the group for accounts with no institution behind them", async () => {
    server.use(...signedIn());
    mount();

    // A regex, because this group holds one account and so renders merged:
    // "No institution · Carteira física" is one text node, not two.
    expect(
      await screen.findByText(new RegExp(app.holdings.noInstitution)),
    ).toBeVisible();
  });

  it("merges the two headers when an institution holds one account", async () => {
    server.use(...signedIn());
    mount();

    // Nesting exists to separate an institution from the accounts inside it.
    // With one account there is nothing to separate, and a second header would
    // spend a level of hierarchy saying the same name twice.
    expect(
      await screen.findByRole("button", {
        name: new RegExp(`${app.holdings.noInstitution} · Carteira física`),
      }),
    ).toBeVisible();
  });

  it("says a position is unvalued instead of showing it as zero", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByText(app.enums.missingReason.NO_QUOTE),
    ).toBeVisible();
  });

  it("collapses a group and records it in the url", async () => {
    server.use(...signedIn());
    const { router } = mount();

    const toggle = await screen.findByRole("button", {
      name: new RegExp("XP Investimentos"),
    });
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(router.state.location.search).toMatchObject({ closed: [XP_ID] });
  });

  it("restores a collapsed group from the address bar", async () => {
    server.use(...signedIn());
    mount(`${PATHS.HOLDINGS}?closed=%5B"${XP_ID}"%5D`);

    expect(
      await screen.findByRole("button", {
        name: new RegExp("XP Investimentos"),
      }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("offers the first run when there are no accounts at all", async () => {
    server.use(
      ...signedIn({
        ...overview,
        total_value: BRL(0),
        free_cash: BRL(0),
        complete: true,
        accounts: [],
        missing: [],
      }),
    );
    mount();

    expect(
      await screen.findByText(app.holdings.empty.noAccounts.title),
    ).toBeVisible();
  });

  it("distinguishes an account that has never recorded anything", async () => {
    server.use(
      ...signedIn({
        ...overview,
        total_value: BRL(0),
        free_cash: BRL(0),
        complete: true,
        accounts: [
          {
            account: BROKER_ID,
            cash: BRL(0),
            subtotal: BRL(0),
            complete: true,
            nominal_return: null,
            real_return: null,
            holdings: [],
          },
        ],
        missing: [],
      }),
    );
    mount();

    expect(
      await screen.findByText(app.holdings.empty.nothingRecorded.title),
    ).toBeVisible();
  });

  it("distinguishes a portfolio whose every position is closed", async () => {
    server.use(
      ...signedIn({
        ...overview,
        total_value: BRL(0),
        free_cash: BRL(0),
        complete: true,
        accounts: [
          {
            account: BROKER_ID,
            cash: BRL(0),
            subtotal: BRL(0),
            complete: true,
            nominal_return: null,
            real_return: null,
            holdings: [closed(BROKER_ID, VALE_ID)],
          },
        ],
        missing: [],
      }),
    );
    mount();

    expect(
      await screen.findByText(app.holdings.empty.allClosed.title),
    ).toBeVisible();
  });

  it("makes each holding row the way into its detail", async () => {
    server.use(...signedIn());
    mount();

    const link = await screen.findByRole("link", { name: /PETR4/ });

    expect(link).toHaveAttribute(
      "href",
      `/app/holdings/${BROKER_ID}/${PETR_ID}`,
    );
  });
});

describe("the holdings screen, by asset", () => {
  const byAsset = `${PATHS.HOLDINGS}?by=asset`;

  it("gathers one asset's positions across accounts", async () => {
    server.use(...signedIn());
    mount(byAsset);

    const group = await screen.findByRole("region", { name: /PETR4/ });

    expect(within(group).getByText(/XP Corretora/)).toBeVisible();
  });

  it("explains average cost, which is a price and not an amount spent", async () => {
    const user = userEvent.setup();
    server.use(...signedIn());
    mount(byAsset);

    // Scoped to one group: every asset group carries its own hint, the same
    // way each carries its own figures.
    const group = await screen.findByRole("region", { name: /PETR4/ });
    await user.click(
      within(group).getByRole("button", {
        name: `What is ${explain.holding.average_cost.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.holding.average_cost.body),
    ).toBeInTheDocument();
  });

  it("states the average cost as a price, not as money", async () => {
    server.use(...signedIn());
    mount(byAsset);

    const group = await screen.findByRole("region", { name: /PETR4/ });

    // 100_000 minor over 10 units is R$100.00 each.
    expect(within(group).getByText(app.holdings.totals.unitCost)).toBeVisible();
    expect(within(group).getByText("R$100.00")).toBeVisible();
  });

  it("shows what the return is made of, not only the rate", async () => {
    server.use(...signedIn());
    mount(byAsset);

    const group = await screen.findByRole("region", { name: /PETR4/ });

    // +20% is R$200.00 of paper gain on R$1,000.00 put in, and nothing sold.
    // A rate the reader cannot decompose is a rate they have to trust.
    expect(within(group).getByText(app.holdings.totals.invested)).toBeVisible();
    expect(within(group).getByText("R$1,000.00")).toBeVisible();
    expect(
      within(group).getByText(app.holdings.totals.unrealized),
    ).toBeVisible();
    // A regex: `SignedFigure` owns the sign and appends a screen-reader label,
    // so the node reads "+R$200.00" plus a word.
    expect(within(group).getByText(/R\$200\.00/)).toBeVisible();
  });

  it("says the total is partial when a position could not be valued", async () => {
    server.use(...signedIn());
    mount(byAsset);

    const group = await screen.findByRole("region", { name: /HASH11/ });

    expect(within(group).getByText(app.holdings.totals.partial)).toBeVisible();
  });

  it("switches pivot through the url, so the view is shareable", async () => {
    server.use(...signedIn());
    const { router } = mount();

    // A `tab`, not a `radio`: the allocation screen already switches a view
    // dimension this way, and one vocabulary for one gesture is the point.
    await userEvent.click(
      await screen.findByRole("tab", { name: app.holdings.pivot.asset }),
    );

    expect(router.state.location.search).toMatchObject({ by: "asset" });
  });

  it("keeps a closed position out of both pivots", async () => {
    server.use(...signedIn());
    mount(byAsset);

    expect(await screen.findByText("PETR4")).toBeVisible();
    expect(screen.queryByText("VALE3")).not.toBeInTheDocument();
  });

  it("gives a principal-based position no unit price to misread", async () => {
    server.use(...signedIn());
    mount(byAsset);

    const group = await screen.findByRole("region", { name: /CDB Banco X/ });

    expect(
      within(group).queryByText(app.holdings.totals.unitCost),
    ).not.toBeInTheDocument();
  });
});

describe("the holdings screen, by purchase", () => {
  const byInstance = `${PATHS.HOLDINGS}?by=asset&grain=instance`;

  it("dates and prices each purchase still held", async () => {
    server.use(...signedIn());
    mount(byInstance);

    await screen.findByRole("region", { name: /PETR4/ });

    expect(await screen.findByText("R$20.00")).toBeVisible();
  });

  it("does not fetch a position's purchases until it is expanded", async () => {
    let asked = 0;
    // The override goes first: `server.use` matches in the order given, so a
    // handler listed after `signedIn()`'s own would never be reached. And only
    // this asset's requests are counted — the other groups stay expanded and
    // legitimately fetch their own.
    server.use(
      http.get(
        `${TEST_API_URL}/api/portfolio/holdings/:account/:asset/`,
        ({ params }) => {
          if (params.asset === PETR_ID) asked += 1;
          return HttpResponse.json({ status: 200, data: holdingDetail });
        },
      ),
      ...signedIn(),
    );
    mount(
      `${PATHS.HOLDINGS}?by=asset&grain=instance&closed=%5B"${PETR_ID}"%5D`,
    );

    await screen.findByRole("region", { name: /PETR4/ });
    expect(asked).toBe(0);
  });

  it("leaves a closed purchase out, as the position filter does one level up", async () => {
    server.use(...signedIn());
    mount(byInstance);

    // The fixture's second lot is CLOSED with nothing remaining, and its entry
    // was priced at R$31.00 — history, not a holding.
    expect(await screen.findByText("R$20.00")).toBeVisible();
    expect(screen.queryByText("R$31.00")).not.toBeInTheDocument();
  });

  it("retries inline when a position's purchases fail to load", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/holdings/:account/:asset/`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
      ...signedIn(),
    );
    mount(byInstance);

    // The page survives: the failure is one position's, not the screen's.
    expect(await screen.findByText(app.holdings.instances.error)).toBeVisible();
    expect(screen.getByRole("region", { name: /HASH11/ })).toBeVisible();
  });

  it("switches grain through the url", async () => {
    server.use(...signedIn());
    const { router } = mount(`${PATHS.HOLDINGS}?by=asset`);

    await userEvent.click(
      await screen.findByRole("tab", { name: app.holdings.grain.instance }),
    );

    expect(router.state.location.search).toMatchObject({ grain: "instance" });
  });

  it("offers no grain control under the custody pivot", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByRole("region", { name: /XP Investimentos/ });

    // A purchase belongs to a position; the custody pivot's rows are accounts.
    expect(
      screen.queryByRole("tab", { name: app.holdings.grain.instance }),
    ).not.toBeInTheDocument();
  });
});
