import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { SalesFilters } from "@/pages/Sales/SalesFilters";
import { SalesTable } from "@/pages/Sales/SalesTable";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { SalesSearch } from "@/schemas/portfolioView";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { SaleRow } from "@/services/sales";

function pair(amount: number, currency: "BRL" = "BRL") {
  return {
    native: { amount, currency },
    base: { amount, currency },
  };
}

/** One lot, one disposal — the common case, and the one with nothing to open. */
const singleSale: SaleRow = {
  lot: {
    id: "b722438a-1577-4e56-8e96-484091aeb2ba",
    label: "Lot — 2025-03-12",
  },
  account: { id: "8d3cc69f-d2c9-4981-9819-ccadbe93b0d0", name: "XP Corretora" },
  asset: {
    id: "669049fb-9333-4c4d-bbde-959e9202700e",
    name: "Petrobras PN",
    archetype: "EXCHANGE_SECURITY",
    currency: "BRL",
  },
  purchased_on: "2025-03-12",
  entry_quantity: "10",
  entry_unit_price: "36.2",
  cost: pair(36_200),
  sold_on: "2026-03-22",
  quantity_sold: "5",
  proceeds: pair(20_800),
  cost_removed: pair(18_100),
  profit: pair(2_700),
  profit_rate: "0.14917127",
  fully_sold: false,
  sales: [
    {
      movement: "9488b734-a60e-449f-a36d-6cdfe3b83c50",
      kind: "SELL",
      sold_on: "2026-03-22",
      quantity: "5",
      proceeds: pair(20_800),
      cost_removed: pair(18_100),
      profit: pair(2_700),
      profit_rate: "0.14917127",
    },
  ],
};

/** One lot sold across two tranches, on two different dates. */
const twoTranches: SaleRow = {
  lot: {
    id: "1565c4ae-ced2-4d4e-8f54-3bfb6d139593",
    label: "Lot — 2025-04-12",
  },
  account: { id: "5c5b285a-7706-46fb-ba9f-42c4b44720c5", name: "XP Corretora" },
  asset: {
    id: "94e50510-ff06-40bb-a8c8-ca8d8ad0aa1d",
    name: "iShares Ibovespa",
    archetype: "EXCHANGE_SECURITY",
    currency: "BRL",
  },
  purchased_on: "2025-04-12",
  entry_quantity: "10",
  entry_unit_price: "124.8",
  cost: pair(124_800),
  sold_on: "2026-07-17",
  quantity_sold: "10",
  proceeds: pair(140_784),
  cost_removed: pair(124_800),
  profit: pair(15_984),
  profit_rate: "0.12807692",
  fully_sold: true,
  sales: [
    {
      movement: "fe67ef48-98d5-4026-94d2-3c54370b4e9a",
      kind: "SELL",
      sold_on: "2026-04-17",
      quantity: "5",
      proceeds: pair(72_384),
      cost_removed: pair(62_400),
      profit: pair(9_984),
      profit_rate: "0.16",
    },
    {
      movement: "b4515391-e3c8-4d49-b91d-53339535df54",
      kind: "SELL",
      sold_on: "2026-07-17",
      quantity: "5",
      proceeds: pair(68_400),
      cost_removed: pair(62_400),
      profit: pair(6_000),
      profit_rate: "0.09615385",
    },
  ],
};

/** A fixed-income maturity: principal-based, no unit quantity or price. */
const principalBased: SaleRow = {
  lot: {
    id: "f80f5d32-0c24-45c9-be02-1c7670784b81",
    label: "Lot — 2025-04-10",
  },
  account: { id: "bbccc838-bf35-49f2-8282-e61e1918a7e1", name: "Conta Nubank" },
  asset: {
    id: "ed801771-bbe1-41d3-8184-a1b1e8d1faad",
    name: "CDB Nubank 110% CDI",
    archetype: "FIXED_INCOME",
    currency: "BRL",
  },
  purchased_on: "2025-04-10",
  entry_quantity: null,
  entry_unit_price: null,
  cost: pair(1_000_000),
  sold_on: "2026-07-19",
  quantity_sold: null,
  proceeds: pair(1_000_000),
  cost_removed: pair(1_000_000),
  profit: pair(0),
  profit_rate: "0",
  fully_sold: true,
  sales: [
    {
      movement: "6113fefc-f302-4423-a4b2-4c1539ec9ab7",
      kind: "REDEMPTION",
      sold_on: "2026-05-27",
      quantity: null,
      proceeds: pair(300_000),
      cost_removed: pair(300_000),
      profit: pair(0),
      profit_rate: "0",
    },
    {
      movement: null,
      kind: "MATURITY",
      sold_on: "2026-07-19",
      quantity: null,
      proceeds: pair(700_000),
      cost_removed: pair(700_000),
      profit: pair(0),
      profit_rate: "0",
    },
  ],
};

/** A disposal whose cost_removed was zero — the result cannot be computed. */
const incomputableResult: SaleRow = {
  ...singleSale,
  lot: {
    id: "aaaaaaaa-1111-4111-8111-111111111111",
    label: "Lot — 2025-01-01",
  },
  cost_removed: pair(0),
  profit: pair(0),
  profit_rate: null,
  sales: [{ ...singleSale.sales[0], cost_removed: pair(0), profit_rate: null }],
};

describe("SalesTable", () => {
  it("renders a single-sale lot without an expander", () => {
    // A lot sold in one movement has nothing to expand into, so no
    // affordance is offered.
    render(<SalesTable rows={[singleSale]} />);

    expect(screen.getByText("Petrobras PN")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: app.sales.expand }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: app.sales.collapse }),
    ).not.toBeInTheDocument();
  });

  it("expands a multi-sale lot into one row per sale", async () => {
    // Clicking the expander reveals both sales, each with its own date and
    // its own rate — not the lot's blended rate repeated twice.
    render(<SalesTable rows={[twoTranches]} />);

    const toggle = screen.getByRole("button", { name: app.sales.expand });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Collapsed: neither tranche's own row is in the document yet.
    expect(screen.queryAllByText(app.sales.kind.SELL)).toHaveLength(0);

    await userEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: app.sales.collapse }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText(app.sales.kind.SELL)).toHaveLength(2);

    // The lot's own blended rate: 15,984 / 124,800 = 0.12807692.
    expect(screen.getByText("+12.807692%")).toBeVisible();

    // Each tranche carries its own rate, not that blended one — a
    // regression that fed every sub-row the parent's rate would leave
    // "+16%" and "+9.615385%" absent from the document, since both would
    // read "+12.807692%" instead. Tied to its own row by date, so a
    // regression that swapped the two tranches' rates would also be caught.
    const firstTrancheRate = screen.getByText("+16%");
    const firstTrancheRow = firstTrancheRate.closest("tr");
    expect(firstTrancheRow).not.toBeNull();
    expect(within(firstTrancheRow!).getByText("04/17/2026")).toBeVisible();

    const secondTrancheRate = screen.getByText("+9.615385%");
    const secondTrancheRow = secondTrancheRate.closest("tr");
    expect(secondTrancheRow).not.toBeNull();
    expect(within(secondTrancheRow!).getByText("07/17/2026")).toBeVisible();
  });

  it("shows a dash where an archetype has no unit price", () => {
    // Principal-based rows carry null entry_quantity/entry_unit_price.
    render(<SalesTable rows={[principalBased]} />);

    const row = screen.getByRole("row", { name: /CDB Nubank/ });
    const cells = within(row).getAllByRole("cell");

    // Column order: asset, cost, quantity, purchasedOn, proceeds, profit,
    // profitRate, soldOn — the quantity cell is index 2.
    expect(cells[2]).toHaveTextContent("—");
    expect(cells[2]).not.toHaveTextContent("×");
  });

  it("shows a dash for an incomputable percentage", () => {
    // profit_rate null must never render as 0%.
    render(<SalesTable rows={[incomputableResult]} />);

    const row = screen.getByRole("row", { name: /Petrobras PN/ });
    const cells = within(row).getAllByRole("cell");

    expect(cells[6]).toHaveTextContent("—");
    expect(cells[6]).not.toHaveTextContent("0%");
  });

  it("marks the result with a sign, not colour alone", () => {
    // The accessible text carries the sign.
    render(<SalesTable rows={[singleSale]} />);

    const row = screen.getByRole("row", { name: /Petrobras PN/ });
    const resultCell = within(row).getAllByRole("cell")[6];

    // The gain's magnitude, matching the server's own hand-verified value
    // (2700 / 18100 = 0.14917127 as a fraction, 14.917127% displayed), with
    // its sign owned by the component rather than left to the formatter.
    expect(resultCell).toHaveTextContent("+14.917127%");
    // A screen reader gets the direction as a word, not only as the glyph.
    expect(within(resultCell).getByText(/gain/i)).toBeInTheDocument();
  });

  it("reconciles the row's three money figures: proceeds minus cost equals profit", () => {
    // singleSale's own lifetime cost (362.00, from a 10-share lot half sold)
    // exceeds proceeds (208.00) while the row is a gain — rendering it in the
    // Cost cell would make the row look like a loss that claims to be a
    // profit. cost_removed (181.00) is the true denominator behind both
    // `profit` and `profit_rate`, and it is the only cost figure that
    // reconciles: 208.00 - 181.00 = 27.00.
    render(<SalesTable rows={[singleSale]} />);

    const row = screen.getByRole("row", { name: /Petrobras PN/ });
    const cells = within(row).getAllByRole("cell");

    // Column order: asset, cost, quantity, purchasedOn, proceeds, profit,
    // profitRate, soldOn.
    const costCell = cells[1];
    const proceedsCell = cells[4];
    const profitCell = cells[5];

    expect(costCell).toHaveTextContent("R$181.00");
    // The lot's lifetime cost must never appear here — that is the bug this
    // test pins.
    expect(costCell).not.toHaveTextContent("362");
    expect(proceedsCell).toHaveTextContent("R$208.00");
    expect(profitCell).toHaveTextContent("+R$27.00");
  });
});

const account: Account = {
  id: "8d3cc69f-d2c9-4981-9819-ccadbe93b0d0",
  name: "XP Corretora",
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

const asset: Asset = {
  id: "669049fb-9333-4c4d-bbde-959e9202700e",
  name: "Petrobras PN",
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

function paginated<T>(results: T[], count = results.length) {
  return { count, next: null, previous: null, results };
}

/** `SalesFilters` always queries both lists on mount, filtered or not. */
function mockStructureLists() {
  return [
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(paginated([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(paginated([asset])),
    ),
  ];
}

function mountFilters(search: SalesSearch) {
  const onChange = vi.fn();
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SalesFilters search={search} onChange={onChange} />
    </QueryClientProvider>,
  );

  return { onChange, ...view };
}

describe("SalesFilters", () => {
  it("puts a chosen account into the URL", async () => {
    // The bar itself never navigates: it reports `{ account: id }` and
    // `index.tsx` is what folds that into the address bar via
    // `navigate({ search: (prev) => ({ ...prev, ...next }) })`.
    server.use(...mockStructureLists());
    const { onChange } = mountFilters({});

    await userEvent.click(
      await screen.findByRole("combobox", {
        name: app.sales.filters.account,
      }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: account.name }),
    );

    expect(onChange).toHaveBeenCalledWith({ account: account.id });
  });

  it("offers a clear action only when a filter is set", async () => {
    // A permanently visible "clear filters" on an unfiltered screen is a
    // control that does nothing, so it stays out until something is set.
    server.use(...mockStructureLists());
    const unfiltered = mountFilters({});

    await screen.findByRole("combobox", { name: app.sales.filters.account });
    expect(
      screen.queryByRole("button", { name: app.sales.filters.clear }),
    ).not.toBeInTheDocument();
    unfiltered.unmount();

    mountFilters({ result: "LOSS" });
    expect(
      await screen.findByRole("button", { name: app.sales.filters.clear }),
    ).toBeVisible();
  });

  it("keeps the other filters when one changes", async () => {
    // Picking a result must not drop the already-chosen date window: the
    // bar reports only the field that changed, which is what makes the
    // page's `{ ...prev, ...next }` merge safe in the first place.
    server.use(...mockStructureLists());
    const { onChange } = mountFilters({
      sold_from: "2026-01-01",
      sold_to: "2026-02-01",
    });

    await userEvent.click(
      await screen.findByRole("combobox", { name: app.sales.filters.result }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: app.sales.result.LOSS }),
    );

    expect(onChange).toHaveBeenCalledWith({ result: "LOSS" });
    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ sold_from: undefined }),
    );
  });

  it("reports the archived toggle so hidden lots become reachable", async () => {
    // `salesSearchSchema` gained `include_archived` to close the gap Task 6's
    // review flagged: without a control for it, archived lots were
    // unreachable from the UI even by hand-editing the URL.
    server.use(...mockStructureLists());
    const { onChange } = mountFilters({});

    await userEvent.click(
      screen.getByRole("switch", { name: app.sales.filters.includeArchived }),
    );

    expect(onChange).toHaveBeenCalledWith({ include_archived: true });
  });
});

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

/** The full route needs the auth guard satisfied, unlike `SalesFilters` alone. */
function signedIn() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(paginated([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(paginated([asset])),
    ),
  ];
}

function mountApp(initialPath: string) {
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

describe("the sales page's filter merge", () => {
  it("keeps an already-set filter in the URL when a second one is chosen", async () => {
    // `SalesFilters` only ever proves it reports a partial update; it never
    // exercises `index.tsx`'s `navigate({ search: (prev) => ({ ...prev,
    // ...next }) })`. A merge that dropped `...prev` would still pass every
    // `SalesFilters` test above — this is the one test that would catch it,
    // by mounting the real route (same harness as `Ledger.test.tsx`'s
    // "filters by type through the URL and the server") and checking that
    // BOTH filters survive in `router.state.location.search`, not just the
    // second one.
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/portfolio/sales/`, () =>
        HttpResponse.json(paginated([])),
      ),
    );

    const { router } = mountApp(PATHS.SALES);
    await screen.findByRole("combobox", { name: app.sales.filters.account });

    await userEvent.click(
      screen.getByRole("combobox", { name: app.sales.filters.account }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: account.name }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        account: account.id,
      }),
    );

    await userEvent.click(
      screen.getByRole("combobox", { name: app.sales.filters.result }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: app.sales.result.LOSS }),
    );

    // A merge that reads `navigate({ search: () => next })` instead would
    // leave `account` out of this object entirely: `result` alone would
    // satisfy a weaker assertion, which is why both keys are asserted
    // together in one `toMatchObject`.
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        account: account.id,
        result: "LOSS",
      }),
    );
  });
});

describe("sales pagination", () => {
  it("reaches a second page of sold-from lots through the pagination control", async () => {
    // `GET /api/portfolio/sales/` paginates at 50; past that, a row is only
    // reachable through a page control. This proves the control is wired to
    // an actual second page, not just rendered.
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/portfolio/sales/`, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        return HttpResponse.json(
          page === "2"
            ? paginated([twoTranches], 51)
            : {
                ...paginated([singleSale], 51),
                next: `${TEST_API_URL}/api/portfolio/sales/?page=2`,
              },
        );
      }),
    );

    mountApp(PATHS.SALES);

    expect(await screen.findByText("Petrobras PN")).toBeVisible();
    expect(screen.queryByText("iShares Ibovespa")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: app.structure.pagination.next }),
    );

    expect(await screen.findByText("iShares Ibovespa")).toBeVisible();
  });

  it("keeps the other filters in the URL when the page changes", async () => {
    // A page step must merge into the previous search the same way a filter
    // change does — `ListPagination`'s `onPageChange` writing `{ page }`
    // alone (dropping `...prev`) would pass every filter-merge test above,
    // since none of them ever touches the pager.
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/portfolio/sales/`, () =>
        HttpResponse.json({
          ...paginated([singleSale], 51),
          next: `${TEST_API_URL}/api/portfolio/sales/?page=2`,
        }),
      ),
    );

    const { router } = mountApp(PATHS.SALES);
    await screen.findByRole("combobox", { name: app.sales.filters.account });

    await userEvent.click(
      screen.getByRole("combobox", { name: app.sales.filters.account }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: account.name }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        account: account.id,
      }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: app.structure.pagination.next }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        account: account.id,
        page: 2,
      }),
    );
  });
});
