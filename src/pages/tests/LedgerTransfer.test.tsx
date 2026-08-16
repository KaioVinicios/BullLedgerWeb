import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { MOVEMENT_TYPE_SPECS } from "@/mocks/movementTypes";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { Movement } from "@/services/movements";
import type { HoldingDetail } from "@/services/portfolio";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const brokerage: Account = {
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

const wallet: Account = {
  ...brokerage,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Carteira fria",
};

const bitcoin: Asset = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Bitcoin",
  archetype: "CRYPTO",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: "BTC",
  decimals: 8,
  price_currency: "BRL",
  chain: "bitcoin",
};

const sourceLot = "44444444-4444-4444-8444-444444444444";

const leg: Movement = {
  id: "55555555-5555-4555-8555-555555555555",
  account: brokerage.id,
  asset: null,
  lot: null,
  type: "TRANSFER_OUT",
  occurred_on: "2026-03-04",
  quantity_delta: null,
  unit_price: null,
  cash_delta: { amount: -50_000, currency: "BRL" },
  fee: null,
  fx_rate: "1",
  note: "",
  replaces: null,
  transfer_of: "66666666-6666-4666-8666-666666666666",
  created_at: "2026-03-04T12:00:00Z",
  voided_at: null,
};

function pair(amount: number) {
  return {
    native: { amount, currency: "BRL" as const },
    base: { amount, currency: "BRL" as const },
  };
}

const holding: HoldingDetail = {
  account: brokerage.id,
  asset: bitcoin.id,
  archetype: "CRYPTO",
  on_date: "2026-03-04",
  holding_start: "2026-01-10",
  holding_period_days: 54,
  registration: "BR_TAXABLE",
  tax_advantaged: false,
  reporting_currency: "BRL",
  quantity: "1.5",
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
      lot: sourceLot,
      label: "Lot — 2026-01-10",
      status: "OPEN",
      quantity_remaining: "1.5",
      principal_remaining: null,
      invested: pair(100_000),
      income_attributed: pair(0),
      realized_gain: pair(0),
      unrealized_gain: null,
      lot_return: null,
      // Untouched so far: the transfer this test exercises hasn't happened
      // yet, so the full entry remains and no exit has been recorded — a
      // TRANSFER_OUT draws a lot down without ever counting as a disposal.
      purchased_on: "2026-01-10",
      entry_quantity: "1.5",
      entry_unit_price: "666.67",
      exits: [],
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
      HttpResponse.json(page([brokerage, wallet])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([bitcoin])),
    ),
    http.get(`${TEST_API_URL}/api/movement-types/`, () =>
      HttpResponse.json({ status: 200, data: MOVEMENT_TYPE_SPECS }),
    ),
    http.get(
      `${TEST_API_URL}/api/portfolio/holdings/${brokerage.id}/${bitcoin.id}/`,
      () => HttpResponse.json({ status: 200, data: holding }),
    ),
  ];
}

function mount() {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [PATHS.LEDGER_TRANSFER] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient };
}

async function selectOption(label: string, option: string | RegExp) {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("the transfer form", () => {
  it("says what a transfer is, and is not", async () => {
    server.use(...signedIn());
    mount();

    // On the screen from the first render, not after the fact: the
    // misconception it corrects is the one a user arrives with.
    expect(
      await screen.findByText(app.ledger.transferForm.basisNote),
    ).toBeVisible();
  });

  // A fresh sign-up can reach this route with no accounts at all. Both sides
  // of a transfer are then unfillable, and a select that still opens onto a
  // blank panel says nothing about why.
  it("closes the account pickers when there are no accounts", async () => {
    server.use(
      // Ahead of signedIn(), whose own handler for this route would otherwise
      // match first and hand back two accounts.
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(page([])),
      ),
      ...signedIn(),
    );
    mount();

    const source = await screen.findByRole("combobox", {
      name: app.ledger.transferForm.source,
    });

    expect(source).toBeDisabled();
    expect(source).toHaveTextContent(app.ledger.form.accountEmpty);
    expect(source).toHaveAccessibleDescription(
      app.ledger.form.accountEmptyHint,
    );

    await userEvent.click(source);
    expect(screen.queryByRole("listbox")).toBeNull();

    expect(
      screen.getByRole("combobox", {
        name: app.ledger.transferForm.destination,
      }),
    ).toBeDisabled();
  });

  it("refuses the same account on both sides before sending it", async () => {
    let posted: unknown;

    server.use(
      ...signedIn(),
      http.post(
        `${TEST_API_URL}/api/movements/transfer/`,
        async ({ request }) => {
          posted = await request.json();
          return HttpResponse.json({
            status: 201,
            data: { out: leg, in: leg },
          });
        },
      ),
    );

    mount();

    await selectOption(app.ledger.transferForm.source, "Corretora");
    await selectOption(app.ledger.transferForm.destination, "Corretora");
    await userEvent.type(
      screen.getByLabelText(app.ledger.transferForm.amount),
      "500.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.transferForm.create }),
    );

    expect(
      await screen.findByText(app.ledger.transferForm.errors.sameAccount),
    ).toBeVisible();
    // The server would say the same thing; saying it first is cheaper.
    expect(posted).toBeUndefined();
  });

  it("records a cash transfer as one action with two legs", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(
        `${TEST_API_URL}/api/movements/transfer/`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 201,
            data: { out: leg, in: leg },
          });
        },
      ),
    );

    const { router } = mount();

    await selectOption(app.ledger.transferForm.source, "Corretora");
    await selectOption(app.ledger.transferForm.destination, "Carteira fria");
    await userEvent.type(
      screen.getByLabelText(app.ledger.transferForm.amount),
      "500.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.transferForm.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LEDGER),
    );
    expect(posted).toMatchObject({
      source_account: brokerage.id,
      destination_account: wallet.id,
      cash_amount: { amount: 50_000, currency: "BRL" },
    });
    // The endpoint decides both legs' types; naming one here would be the
    // client deciding what only the pair can mean.
    expect(posted).not.toHaveProperty("type");
    expect(posted?.quantity).toBeNull();
  });

  it("requires a source lot once an asset is chosen", async () => {
    let posted: unknown;

    server.use(
      ...signedIn(),
      http.post(
        `${TEST_API_URL}/api/movements/transfer/`,
        async ({ request }) => {
          posted = await request.json();
          return HttpResponse.json({
            status: 201,
            data: { out: leg, in: leg },
          });
        },
      ),
    );

    mount();

    await selectOption(app.ledger.transferForm.source, "Corretora");
    await selectOption(app.ledger.transferForm.destination, "Carteira fria");
    await selectOption(app.ledger.transferForm.asset, "Bitcoin");
    await userEvent.type(
      await screen.findByLabelText(app.ledger.transferForm.quantity),
      "0.5",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.transferForm.create }),
    );

    // `movement_transfer_source_lot_required`: units leave a contribution, and
    // which one decides the basis that travels with them.
    expect(await screen.findByText(app.ledger.form.errors.lot)).toBeVisible();
    expect(posted).toBeUndefined();
  });

  it("sends a quantity and no cash for a crypto transfer", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(
        `${TEST_API_URL}/api/movements/transfer/`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 201,
            data: { out: leg, in: leg },
          });
        },
      ),
    );

    mount();

    await selectOption(app.ledger.transferForm.source, "Corretora");
    await selectOption(app.ledger.transferForm.destination, "Carteira fria");
    await selectOption(app.ledger.transferForm.asset, "Bitcoin");

    // Units move; cash does not. There is no amount field to fill in at all.
    expect(
      screen.queryByLabelText(app.ledger.transferForm.amount),
    ).not.toBeInTheDocument();

    await userEvent.type(
      await screen.findByLabelText(app.ledger.transferForm.quantity),
      "0.5",
    );
    await selectOption(app.ledger.transferForm.sourceLot, /Lot — 2026-01-10/);
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.transferForm.create }),
    );

    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({
      asset: bitcoin.id,
      quantity: "0.5",
      source_lot: sourceLot,
    });
    expect(posted?.cash_amount).toBeNull();
  });
});
