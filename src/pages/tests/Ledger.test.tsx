import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import type { Movement } from "@/services/movements";

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

const asset: Asset = {
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

const buy: Movement = {
  id: "44444444-4444-4444-8444-444444444444",
  account: account.id,
  asset: asset.id,
  lot: "33333333-3333-4333-8333-333333333333",
  type: "BUY",
  occurred_on: "2026-03-04",
  quantity_delta: "10",
  unit_price: "19.40",
  cash_delta: { amount: -20_400, currency: "BRL" },
  fee: { amount: 1_000, currency: "BRL" },
  fx_rate: "1",
  note: "",
  replaces: null,
  transfer_of: null,
  created_at: "2026-03-04T12:00:00Z",
  voided_at: null,
};

const voided: Movement = {
  ...buy,
  id: "55555555-5555-4555-8555-555555555555",
  type: "TAX",
  occurred_on: "2026-02-01",
  quantity_delta: null,
  unit_price: null,
  lot: null,
  fee: null,
  cash_delta: { amount: -1_234, currency: "BRL" },
  voided_at: "2026-02-02T09:00:00Z",
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
      HttpResponse.json(page([asset])),
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

describe("the ledger list", () => {
  it("renders a movement with its date, type, and signed amount", async () => {
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([buy])),
      ),
    );

    mount(PATHS.LEDGER);

    expect(await screen.findByText("03/04/2026")).toBeVisible();
    expect(screen.getByText(app.enums.movementType.BUY)).toBeVisible();
    // Money out is shown as money out, with the sign carrying the meaning —
    // never colour alone.
    expect(screen.getByText(/^-R\$204\.00/)).toBeVisible();
    // A fee that rode on the trade is marked on the trade, not given a row.
    expect(screen.getByText(app.ledger.withFee)).toBeVisible();
  });

  it("hides voided rows until they are explicitly asked for", async () => {
    const seen: Array<string | null> = [];

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get("include_voided"));
        return HttpResponse.json(
          url.searchParams.get("include_voided") === "true"
            ? page([buy, voided])
            : page([buy]),
        );
      }),
    );

    const { router } = mount(PATHS.LEDGER);
    await screen.findByText(app.enums.movementType.BUY);
    expect(
      screen.queryByText(app.enums.movementType.TAX),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("switch", { name: app.ledger.showVoided }),
    );

    expect(await screen.findByText(app.enums.movementType.TAX)).toBeVisible();
    expect(screen.getByText(app.ledger.voidedBadge)).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        include_voided: true,
      }),
    );
    expect(seen).toEqual([null, "true"]);
  });

  it("filters by type through the URL and the server", async () => {
    const seen: Array<string | null> = [];

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("type"));
        return HttpResponse.json(page([buy]));
      }),
    );

    const { router } = mount(PATHS.LEDGER);
    await screen.findByText(app.enums.movementType.BUY);

    await userEvent.click(
      screen.getByRole("combobox", { name: app.ledger.filters.type }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: app.enums.movementType.SELL }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ type: "SELL" }),
    );
    await waitFor(() => expect(seen).toEqual([null, "SELL"]));
  });

  it("restores a filtered view from the URL and offers a way back", async () => {
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get("type") === "SELL"
            ? page([])
            : page([buy]),
        ),
      ),
    );

    mount(`${PATHS.LEDGER}?type=SELL`);

    expect(await screen.findByText(app.ledger.noMatches.title)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.noMatches.clear }),
    );

    expect(await screen.findByText(app.enums.movementType.BUY)).toBeVisible();
  });

  it("names the next action when nothing has been recorded", async () => {
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
    );

    mount(PATHS.LEDGER);

    expect(await screen.findByText(app.ledger.empty.title)).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: app.ledger.record }).length,
    ).toBeGreaterThan(0);
  });

  it("offers no way to reorder — the domain's order is the only order", async () => {
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([buy])),
      ),
    );

    mount(PATHS.LEDGER);
    await screen.findByText(app.enums.movementType.BUY);

    // The structure lists put a button inside their sortable headers. There is
    // no `ordering` parameter on this endpoint, so there must be none here.
    const date = screen.getByRole("columnheader", {
      name: app.ledger.columns.date,
    });
    expect(within(date).queryByRole("button")).not.toBeInTheDocument();
  });
});
