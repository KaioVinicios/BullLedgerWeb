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
import type { PriceQuote } from "@/services/pricing";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const account: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Corretora",
  institution: null,
  institution_name: "",
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

const quotes: PriceQuote[] = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    asset: petr.id,
    date: "2026-06-12",
    price: "34.10",
    price_source: "MANUAL",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    asset: petr.id,
    date: "2026-06-11",
    price: "33.95",
    price_source: "FEED",
  },
  // The server writes this one itself, from a BUY's execution price — the
  // screen never posts it, but it lists it like any other row.
  {
    id: "88888888-8888-4888-8888-888888888888",
    asset: petr.id,
    date: "2026-06-10",
    price: "33.40",
    price_source: "TRADE",
  },
];

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function overview(missing: unknown[] = [], complete = missing.length === 0) {
  return {
    status: 200,
    data: {
      on_date: "2026-08-02",
      reporting_currency: "BRL",
      total_value: { amount: 120_000, currency: "BRL" },
      free_cash: { amount: 0, currency: "BRL" },
      complete,
      accounts: [],
      archetypes: [],
      nominal_return: null,
      real_return: null,
      missing,
    },
  };
}

function signedIn(quoteRows: PriceQuote[] = quotes) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([petr])),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json(overview()),
    ),
    http.get(`${TEST_API_URL}/api/price-quotes/`, () =>
      HttpResponse.json(page(quoteRows)),
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

describe("the quotes screen", () => {
  it("renders each quote with its source as a word", async () => {
    server.use(...signedIn());
    mount(PATHS.PRICING);

    expect(await screen.findByText("34.1")).toBeVisible();
    expect(screen.getByText("33.95")).toBeVisible();

    // Source is a word before it is a shade.
    expect(screen.getByText(app.enums.priceSource.MANUAL)).toBeVisible();
    expect(screen.getByText(app.enums.priceSource.FEED)).toBeVisible();
    // Including the source the user never picks: a quote derived from their
    // own trade is a word too, not the raw key behind it.
    expect(screen.getByText(app.enums.priceSource.TRADE)).toBeVisible();
    expect(screen.queryByText(/enums\.priceSource/)).not.toBeInTheDocument();

    // A price is not Money: no currency symbol and no minor-unit division —
    // the decimal string as recorded, with the asset's currency code beside it.
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("BRL").length).toBeGreaterThan(0);
  });

  it("drives the asset filter through the URL", async () => {
    server.use(...signedIn());
    const { router } = mount(PATHS.PRICING);

    await screen.findByText("34.1");
    await userEvent.click(
      screen.getByRole("combobox", { name: app.pricing.filters.asset }),
    );
    await userEvent.click(screen.getByRole("option", { name: "PETR4" }));

    // Shareable and restorable: the filter lives in the address bar.
    expect(router.state.location.search).toEqual({ asset: petr.id });
  });

  it("states the quote's age against the valuation date when filtered", async () => {
    server.use(...signedIn());
    mount(`${PATHS.PRICING}?asset=${petr.id}`);

    // A dated fact, not a verdict: the two dates side by side. The server has
    // no notion of staleness and neither does this screen.
    expect(
      await screen.findByText(new RegExp(app.pricing.age.precedesValuation)),
    ).toBeVisible();
  });

  it("says nothing about age when no single asset is in view", async () => {
    server.use(...signedIn());
    mount(PATHS.PRICING);

    await screen.findByText("34.1");
    // Unfiltered, the newest row is the newest across the whole portfolio and
    // says nothing about any one asset. Claiming otherwise would be a lie.
    expect(
      screen.queryByText(new RegExp(app.pricing.age.precedesValuation)),
    ).not.toBeInTheDocument();
  });

  it("names the next action when nothing has been priced", async () => {
    server.use(...signedIn([]));
    mount(PATHS.PRICING);

    expect(await screen.findByText(app.pricing.empty.title)).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: app.pricing.recordQuote }).length,
    ).toBeGreaterThan(0);
  });

  it("offers a retry when the list fails, without leaking the payload", async () => {
    server.use(
      // Override first: MSW resolves with the first handler that matches, and
      // `signedIn()` already serves this path.
      //
      // A 400 rather than a 500 on purpose, too. `queryClient` retries
      // `server` and `network` failures twice with backoff — correct
      // behaviour, and slower than this assertion should wait. What is under
      // test is the error surface, which does not care which failure produced
      // it.
      http.get(`${TEST_API_URL}/api/price-quotes/`, () =>
        HttpResponse.json({ status: 400, detail: "boom" }, { status: 400 }),
      ),
      ...signedIn(),
    );
    mount(PATHS.PRICING);

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByText(app.structure.loadFailed)).toBeVisible();
    // Never the raw payload.
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });
});

const NO_QUOTE = {
  account: account.id,
  asset: petr.id,
  reason: "NO_QUOTE" as const,
};
const NO_FX = { account: account.id, asset: petr.id, reason: "NO_FX" as const };

/** Override first — MSW resolves with the first handler that matches. */
function withOverview(body: ReturnType<typeof overview>) {
  return [
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json(body),
    ),
    ...signedIn(),
  ];
}

describe("coverage", () => {
  it("names each holding that cannot be valued and offers to price it", async () => {
    server.use(...withOverview(overview([NO_QUOTE], false)));
    mount(PATHS.PRICING);

    expect(await screen.findByText(app.pricing.coverage.title)).toBeVisible();

    // Named, not counted: the user needs to know which holding, in which
    // account, before they can do anything about it. Scoped to the region,
    // because the sidebar is a list of `<li>` too.
    const region = screen.getByRole("region", {
      name: app.pricing.coverage.title,
    });
    const item = within(region).getByRole("listitem");
    expect(item).toHaveTextContent("PETR4");
    expect(item).toHaveTextContent("Corretora");

    expect(
      screen.getByRole("link", { name: app.pricing.coverage.priceIt }),
    ).toHaveAttribute("href", expect.stringContaining(petr.id));
  });

  it("states a missing rate without offering a control that cannot work", async () => {
    server.use(...withOverview(overview([NO_FX], false)));
    mount(PATHS.PRICING);

    expect(
      await screen.findByText(app.pricing.coverage.noFxTitle),
    ).toBeVisible();
    expect(
      screen.getByText(new RegExp(app.enums.missingReason.NO_FX)),
    ).toBeVisible();

    // The FX table is global and staff-written, so there is nothing to offer
    // here beyond a way to go look at it.
    expect(
      screen.queryByRole("link", { name: app.pricing.coverage.priceIt }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: app.pricing.coverage.seeRates }),
    ).toBeVisible();
  });

  it("affirms completeness rather than merely staying silent", async () => {
    server.use(...withOverview(overview([], true)));
    mount(PATHS.PRICING);

    // Absence of a warning is not the same as confirmation, and `complete` is
    // what tells them apart.
    expect(
      await screen.findByText(/Every holding has a price and a rate/),
    ).toBeVisible();
  });

  it("says it could not check, rather than implying nothing is missing", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
        HttpResponse.json({ status: 400, detail: "boom" }, { status: 400 }),
      ),
      ...signedIn(),
    );
    mount(PATHS.PRICING);

    expect(await screen.findByText(app.pricing.coverage.unknown)).toBeVisible();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    // And the rest of the screen still works: a failed check must not take
    // the list down with it.
    expect(screen.getByText("34.1")).toBeVisible();
  });
});
