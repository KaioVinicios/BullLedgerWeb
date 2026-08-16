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
import type { HoldingDetail, LotProjection } from "@/services/portfolio";
import { todayCalendarDate } from "@/utils/date";

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

const savings: Asset = {
  id: "88888888-8888-4888-8888-888888888888",
  name: "Poupança",
  archetype: "CASH_DEPOSIT",
  currency: "BRL",
  country: "BR",
  pricing_mode: "ACCRUAL",
  archived_at: null,
  compounding: "MONTHLY",
  deposit_insurance: "FGC",
  liquidity: "IMMEDIATE",
  rate_type: "FLOATING",
  rate_index: "CDI",
};

const certificate: Asset = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "CDB 2030",
  archetype: "FIXED_INCOME",
  currency: "BRL",
  country: "BR",
  pricing_mode: "ACCRUAL",
  archived_at: null,
  instrument_kind: "CERTIFICATE",
  issuer_type: "BANK",
  maturity_date: "2030-01-01",
  rate_type: "FLOATING",
  rate_index: "CDI",
  coupon_rate: "0",
  coupon_frequency: "NONE",
  tax_advantaged: false,
  early_redemption: true,
  deposit_insurance: "FGC",
};

const recorded: Movement = {
  id: "44444444-4444-4444-8444-444444444444",
  account: account.id,
  asset: null,
  lot: null,
  type: "DEPOSIT",
  occurred_on: "2026-03-04",
  quantity_delta: null,
  unit_price: null,
  cash_delta: { amount: 10_000, currency: "BRL" },
  fee: null,
  fx_rate: "1",
  note: "",
  replaces: null,
  transfer_of: null,
  created_at: "2026-03-04T12:00:00Z",
  voided_at: null,
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
      HttpResponse.json(page([security, savings, certificate])),
    ),
    http.get(`${TEST_API_URL}/api/movement-types/`, () =>
      HttpResponse.json({ status: 200, data: MOVEMENT_TYPE_SPECS }),
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

/**
 * Anchors an assertion on the literal tail of an interpolated message — the
 * braces are what the component fills in, so only the words around them are the
 * test's to match.
 */
function tailOf(message: string) {
  const tail = message.slice(message.lastIndexOf("}}") + 2);

  return new RegExp(tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/** Radix comboboxes need the trigger opened before the option exists. */
async function selectOption(label: string, option: string | RegExp) {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("the movement entry form", () => {
  // Nothing can be recorded without an account, and until now the field said
  // that by opening a blank panel over itself.
  it("closes the account picker when there are no accounts", async () => {
    server.use(
      // Ahead of signedIn(), whose handler for this route would match first.
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(page([])),
      ),
      ...signedIn(),
    );
    mount(PATHS.LEDGER_NEW);

    const account = await screen.findByRole("combobox", {
      name: app.ledger.form.account,
    });

    expect(account).toBeDisabled();
    expect(account).toHaveTextContent(app.ledger.form.accountEmpty);
    expect(account).toHaveAccessibleDescription(
      app.ledger.form.accountEmptyHint,
    );

    await userEvent.click(account);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // The asset picker is the counter-example, and the reason it is asserted
  // here: it always offers "no asset — the account's own cash", so its list is
  // never empty and it must keep opening even with no assets at all.
  it("keeps the asset picker open when there are no assets", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(page([])),
      ),
      ...signedIn(),
    );
    mount(PATHS.LEDGER_NEW);

    const asset = await screen.findByRole("combobox", {
      name: app.ledger.form.asset,
    });

    expect(asset).toBeEnabled();

    await userEvent.click(asset);

    expect(
      await screen.findByRole("option", { name: app.ledger.form.noAsset }),
    ).toBeVisible();
  });

  it("offers only the archetype's types, and never a transfer", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "PETR4");
    await userEvent.click(
      screen.getByRole("combobox", { name: app.ledger.form.type }),
    );

    // EXCHANGE_SECURITY's column of the matrix…
    expect(
      await screen.findByRole("option", { name: app.enums.movementType.BUY }),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: app.enums.movementType.SPLIT }),
    ).toBeVisible();
    // …and nobody else's.
    expect(
      screen.queryByRole("option", { name: app.enums.movementType.INTEREST }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: app.enums.movementType.COUPON }),
    ).not.toBeInTheDocument();
    // Transfers are a different endpoint and a different screen.
    expect(
      screen.queryByRole("option", {
        name: app.enums.movementType.TRANSFER_OUT,
      }),
    ).not.toBeInTheDocument();
  });

  it("offers a different column once the asset changes archetype", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "Poupança");
    await userEvent.click(
      screen.getByRole("combobox", { name: app.ledger.form.type }),
    );

    expect(
      await screen.findByRole("option", {
        name: app.enums.movementType.INTEREST,
      }),
    ).toBeVisible();
    // No dividend on a savings account — the roadmap's own example.
    expect(
      screen.queryByRole("option", { name: app.enums.movementType.DIVIDEND }),
    ).not.toBeInTheDocument();
  });

  it("offers only the asset-less types when no asset is chosen", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await userEvent.click(
      await screen.findByRole("combobox", { name: app.ledger.form.type }),
    );

    expect(
      await screen.findByRole("option", {
        name: app.enums.movementType.DEPOSIT,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: app.enums.movementType.BUY }),
    ).not.toBeInTheDocument();
  });

  it("clears a type the new asset cannot take, rather than sending it", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.SPLIT);
    expect(
      screen.getByRole("combobox", { name: app.ledger.form.type }),
    ).toHaveTextContent(app.enums.movementType.SPLIT);

    // SPLIT is EXCHANGE_SECURITY-only; moving to a savings account must not
    // leave it selected and waiting to be rejected.
    await selectOption(app.ledger.form.asset, "Poupança");
    expect(
      screen.getByRole("combobox", { name: app.ledger.form.type }),
    ).not.toHaveTextContent(app.enums.movementType.SPLIT);
  });

  it("labels the amount by direction and never asks for a minus sign", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.type, app.enums.movementType.DEPOSIT);
    expect(
      await screen.findByLabelText(app.ledger.form.amountReceived),
    ).toBeVisible();

    await selectOption(app.ledger.form.type, app.enums.movementType.WITHDRAWAL);
    expect(
      await screen.findByLabelText(app.ledger.form.amountPaid),
    ).toBeVisible();
  });

  it("defaults the date to today and lets it be moved back without friction", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    const date = await screen.findByLabelText(app.ledger.form.occurredOn);
    expect(date).toHaveValue(todayCalendarDate());

    await userEvent.clear(date);
    await userEvent.type(date, "2024-11-02");
    // No warning, no confirmation — a late entry is an ordinary entry.
    expect(date).toHaveValue("2024-11-02");
  });

  it("records a withdrawal with the sign the convention requires", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(`${TEST_API_URL}/api/movements/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: recorded },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.type, app.enums.movementType.WITHDRAWAL);
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountPaid),
      "250.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LEDGER),
    );
    expect(posted).toMatchObject({
      type: "WITHDRAWAL",
      asset: null,
      cash_delta: { amount: -25_000, currency: "BRL" },
      quantity_delta: null,
      fee: null,
    });
  });

  it("keeps the context and clears the numbers on record-and-add-another", async () => {
    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json({ status: 201, data: recorded }, { status: 201 }),
      ),
    );

    const { router } = mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.type, app.enums.movementType.DEPOSIT);
    const amount = screen.getByLabelText(app.ledger.form.amountReceived);
    await userEvent.type(amount, "100.00");
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.createAndAnother }),
    );

    // Still on the form, context intact, numbers gone, focus back on the money.
    await waitFor(() => expect(amount).toHaveValue(""));
    expect(router.state.location.pathname).toBe(PATHS.LEDGER_NEW);
    expect(
      screen.getByRole("combobox", { name: app.ledger.form.account }),
    ).toHaveTextContent("Corretora");
    expect(amount).toHaveFocus();
  });

  it("lands a model-keyed rejection on the input that produced it", async () => {
    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            // The server rejects from `clean()`, which keys on *model* field
            // names — not the serializer's. A form claiming only `cash_delta`
            // would send this to the banner instead of to the input.
            errors: {
              cash_delta_minor: ["cash_delta must be negative for Withdrawal."],
            },
            codes: { cash_delta_minor: ["movement_cash_sign_invalid"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.type, app.enums.movementType.WITHDRAWAL);
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountPaid),
      "250.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    expect(
      await screen.findByText(/cash_delta must be negative/),
    ).toBeVisible();
    expect(screen.getByLabelText(app.ledger.form.amountPaid)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("the trade fields", () => {
  it("reveals quantity, price, and fee only where the type carries them", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);

    expect(
      await screen.findByLabelText(app.ledger.form.quantityAcquired),
    ).toBeVisible();
    expect(screen.getByLabelText(app.ledger.form.unitPrice)).toBeVisible();
    expect(screen.getByLabelText(app.ledger.form.fee)).toBeVisible();

    // A dividend is cash and nothing else. In particular it has no fee: the
    // server allows one on BUY and SELL only, and a standalone FEE row is what
    // a custody charge actually is.
    await selectOption(app.ledger.form.type, app.enums.movementType.DIVIDEND);
    expect(
      screen.queryByLabelText(app.ledger.form.quantityAcquired),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.ledger.form.unitPrice),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.ledger.form.fee),
    ).not.toBeInTheDocument();
  });

  it("makes the quantity optional on a lump-principal certificate", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "CDB 2030");
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);

    expect(
      await screen.findByText(app.ledger.form.quantityOptional),
    ).toBeVisible();
    // A CDB is a sum of money, so the price per unit has nothing to price
    // until units are actually stated.
    expect(
      screen.queryByLabelText(app.ledger.form.unitPrice),
    ).not.toBeInTheDocument();
  });

  it("keeps the quantity required on a unit-based buy", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);
    expect(
      screen.queryByText(app.ledger.form.quantityOptional),
    ).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountPaid),
      "204.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    // Said here rather than by the server's `movement_quantity_required`.
    expect(
      await screen.findByText(app.ledger.form.errors.quantity),
    ).toBeVisible();
  });

  it("confirms the arithmetic when quantity, price, and amount agree", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.quantityAcquired),
      "10",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.unitPrice),
      "19.40",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountPaid),
      "204.00",
    );
    await userEvent.type(screen.getByLabelText(app.ledger.form.fee), "10.00");

    // 204.00 paid, of which 10.00 was fee → 194.00 gross, which is 10 × 19.40.
    expect(await screen.findByText(/10 × R\$\s?19\.40/)).toBeVisible();
  });

  it("says so when they do not, and still lets the movement through", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(`${TEST_API_URL}/api/movements/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: recorded },
          { status: 201 },
        );
      }),
    );

    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.quantityAcquired),
      "10",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.unitPrice),
      "19.40",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountPaid),
      "500.00",
    );

    expect(
      await screen.findByText(tailOf(app.ledger.form.identityMismatch)),
    ).toBeVisible();

    // A hint, not a gate. The server owns rounding, and a legitimate trade can
    // sit outside the identity for reasons this form cannot see.
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );
    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({
      quantity_delta: "10",
      unit_price: "19.40",
      cash_delta: { amount: -50_000, currency: "BRL" },
    });
  });
});

const openLot = "33333333-3333-4333-8333-333333333333";
const closedLot = "55555555-5555-4555-8555-555555555555";

/** Both figures a `MoneyPair` needs, at the same value. */
function pair(amount: number) {
  return {
    native: { amount, currency: "BRL" as const },
    base: { amount, currency: "BRL" as const },
  };
}

function lotProjection(overrides: Partial<LotProjection> = {}): LotProjection {
  return {
    lot: openLot,
    label: "Lot — 2026-01-10",
    status: "OPEN",
    quantity_remaining: "7",
    principal_remaining: null,
    invested: pair(100_000),
    income_attributed: pair(0),
    realized_gain: pair(0),
    unrealized_gain: null,
    lot_return: null,
    // The default lot is untouched: bought whole, nothing drawn from it yet.
    purchased_on: "2026-01-10",
    entry_quantity: "7",
    entry_unit_price: "142.86",
    exits: [],
    ...overrides,
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
  quantity: "7",
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
    lotProjection(),
    lotProjection({
      lot: closedLot,
      label: "Lot — 2025-08-02",
      status: "CLOSED",
      quantity_remaining: "0",
      // Fully sold, unlike the default open lot above: the whole entry was
      // drawn down in one exit, so nothing is left to offer in the picker.
      purchased_on: "2025-08-02",
      entry_quantity: "7",
      entry_unit_price: "142.86",
      exits: [
        {
          movement: "77777777-7777-4777-8777-777777777777",
          kind: "SELL",
          sold_on: "2026-01-05",
          quantity: "7",
          proceeds: pair(100_000),
          cost_removed: pair(100_000),
          profit: pair(0),
          profit_rate: "0",
        },
      ],
    }),
  ],
};

function withHolding() {
  return http.get(
    `${TEST_API_URL}/api/portfolio/holdings/${account.id}/${security.id}/`,
    () => HttpResponse.json({ status: 200, data: holding }),
  );
}

/** Everything a sell needs before its lot: the account, the asset, the type. */
async function startASale() {
  await selectOption(app.ledger.form.account, "Corretora");
  await selectOption(app.ledger.form.asset, "PETR4");
  await selectOption(app.ledger.form.type, app.enums.movementType.SELL);
}

describe("the lot selector", () => {
  it("appears only on an exit that carries an asset", async () => {
    server.use(...signedIn(), withHolding());
    mount(PATHS.LEDGER_NEW);

    await startASale();
    expect(
      await screen.findByRole("combobox", { name: app.ledger.form.lot }),
    ).toBeVisible();

    // An entry creates its own lot — sending one is `movement_lot_not_accepted`.
    await selectOption(app.ledger.form.type, app.enums.movementType.BUY);
    expect(
      screen.queryByRole("combobox", { name: app.ledger.form.lot }),
    ).not.toBeInTheDocument();

    // And income is attributed by the server, never drawn from a contribution.
    await selectOption(app.ledger.form.type, app.enums.movementType.DIVIDEND);
    expect(
      screen.queryByRole("combobox", { name: app.ledger.form.lot }),
    ).not.toBeInTheDocument();
  });

  it("offers open lots only, labelled with what is left", async () => {
    server.use(...signedIn(), withHolding());
    mount(PATHS.LEDGER_NEW);

    await startASale();
    await userEvent.click(
      await screen.findByRole("combobox", { name: app.ledger.form.lot }),
    );

    expect(
      await screen.findByRole("option", { name: /Lot — 2026-01-10 — 7 left/ }),
    ).toBeVisible();
    // A closed contribution has nothing left to draw from, so it is not a
    // choice at all rather than a choice that fails.
    expect(
      screen.queryByRole("option", { name: /Lot — 2025-08-02/ }),
    ).not.toBeInTheDocument();
  });

  it("catches an overdraw before the request rather than after", async () => {
    let posted: unknown;

    server.use(
      ...signedIn(),
      withHolding(),
      http.post(`${TEST_API_URL}/api/movements/`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { status: 201, data: recorded },
          { status: 201 },
        );
      }),
    );

    mount(PATHS.LEDGER_NEW);
    await startASale();
    await selectOption(app.ledger.form.lot, /Lot — 2026-01-10/);

    await userEvent.type(
      screen.getByLabelText(app.ledger.form.quantityDisposed),
      "9",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.unitPrice),
      "21.00",
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountReceived),
      "189.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    expect(await screen.findByText(/only holds 7/)).toBeVisible();
    // Nine units out of a contribution holding seven is a 400 the client can
    // see coming, so it never becomes a request.
    expect(posted).toBeUndefined();
  });

  // A holding whose lots are all closed cannot be exited at all. The hint
  // already said so; the trigger used to sit there openable and blank.
  it("closes itself when there is no open contribution", async () => {
    server.use(
      ...signedIn(),
      http.get(
        `${TEST_API_URL}/api/portfolio/holdings/${account.id}/${security.id}/`,
        () =>
          HttpResponse.json({
            status: 200,
            data: { ...holding, lots: [] },
          }),
      ),
    );
    mount(PATHS.LEDGER_NEW);
    await startASale();

    const lot = await screen.findByRole("combobox", {
      name: app.ledger.form.lot,
    });

    await waitFor(() => expect(lot).toBeDisabled());
    expect(lot).toHaveTextContent(app.ledger.form.lotNone);
    // The full sentence stays in the hint, which is the only thing a screen
    // reader still reaches once the trigger has left the tab order.
    expect(lot).toHaveAccessibleDescription(app.ledger.form.lotEmpty);

    await userEvent.click(lot);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("falls back to plain labels when the projection is unavailable", async () => {
    server.use(
      ...signedIn(),
      http.get(
        `${TEST_API_URL}/api/portfolio/holdings/${account.id}/${security.id}/`,
        () =>
          HttpResponse.json(
            { status: 404, message: "No holding.", errors: {} },
            { status: 404 },
          ),
      ),
      http.get(`${TEST_API_URL}/api/lots/`, () =>
        HttpResponse.json(
          page([
            {
              id: openLot,
              account: account.id,
              asset: security.id,
              label: "Lot — 2026-01-10",
              archived_at: null,
            },
          ]),
        ),
      ),
    );

    mount(PATHS.LEDGER_NEW);
    await startASale();
    await userEvent.click(
      await screen.findByRole("combobox", { name: app.ledger.form.lot }),
    );

    // A holding with no price still has lots: the picker keeps working, it
    // just stops knowing how much is left in each.
    const option = await screen.findByRole("option", {
      name: "Lot — 2026-01-10",
    });
    expect(option).toBeVisible();
    expect(option).not.toHaveTextContent("left");
  });
});

const adr: Asset = {
  id: "77777777-7777-4777-8777-777777777777",
  name: "AAPL",
  archetype: "EXCHANGE_SECURITY",
  currency: "USD",
  country: "US",
  pricing_mode: "MARKET",
  archived_at: null,
  ticker: "AAPL",
  exchange: "NASDAQ",
  security_type: "STOCK",
  pays_distributions: true,
};

/** The same signed-in world, with a foreign-currency holding in it. */
function withForeignAsset() {
  return http.get(`${TEST_API_URL}/api/assets/`, () =>
    HttpResponse.json(page([security, savings, certificate, adr])),
  );
}

describe("the exchange rate", () => {
  it("states the rate as a fact when the currencies match", async () => {
    server.use(...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.DIVIDEND);

    expect(
      await screen.findByText(app.ledger.form.fxSameCurrency),
    ).toBeVisible();
    // A value with one possible answer is not a question.
    expect(
      screen.queryByLabelText(app.ledger.form.fxRate),
    ).not.toBeInTheDocument();
  });

  it("offers an optional input when they differ", async () => {
    server.use(withForeignAsset(), ...signedIn());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "AAPL");
    await selectOption(app.ledger.form.type, app.enums.movementType.DIVIDEND);

    const rate = await screen.findByLabelText(app.ledger.form.fxRate);
    expect(rate).toHaveValue("");
    expect(screen.getByText(app.ledger.form.fxRateHint)).toBeVisible();
    expect(
      screen.queryByText(app.ledger.form.fxSameCurrency),
    ).not.toBeInTheDocument();
  });

  it("turns required when the server cannot resolve one", async () => {
    server.use(
      withForeignAsset(),
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              fx_rate: [
                "No FX rate available for USD->BRL on 2026-03-04; provide fx_rate explicitly.",
              ],
            },
            codes: { fx_rate: ["movement_fx_rate_unresolvable"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "AAPL");
    await selectOption(app.ledger.form.type, app.enums.movementType.DIVIDEND);
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.amountReceived),
      "12.00",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    // Optional until the day has no rate to resolve; then it is the only way
    // forward, and the server's own sentence says so on the input itself.
    expect(await screen.findByText(/No FX rate available/)).toBeVisible();
    expect(screen.getByLabelText(app.ledger.form.fxRate)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("corporate actions", () => {
  it("asks for a direction instead of a sign on a split", async () => {
    server.use(...signedIn(), withHolding());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.SPLIT);

    expect(
      await screen.findByRole("radio", {
        name: app.ledger.form.directionGained,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: app.ledger.form.directionLost }),
    ).toBeVisible();
    expect(
      screen.getByLabelText(app.ledger.form.quantityChanged),
    ).toBeVisible();

    // A split moves no cash, so there is no amount to ask for…
    expect(
      screen.queryByLabelText(app.ledger.form.amountReceived),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.ledger.form.amountPaid),
    ).not.toBeInTheDocument();

    // …and the position is shown as read, so the user converts the ratio and
    // the client never does it for them.
    expect(await screen.findByText(/Currently held: 7/)).toBeVisible();
  });

  it("sends a reverse split as a negative quantity with zero cash", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      withHolding(),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(`${TEST_API_URL}/api/movements/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: recorded },
          { status: 201 },
        );
      }),
    );

    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.SPLIT);
    await userEvent.click(
      await screen.findByRole("radio", { name: app.ledger.form.directionLost }),
    );
    await userEvent.type(
      screen.getByLabelText(app.ledger.form.quantityChanged),
      "45",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.create }),
    );

    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({
      type: "SPLIT",
      quantity_delta: "-45",
      cash_delta: { amount: 0, currency: "BRL" },
      unit_price: null,
    });
  });

  it("asks for no direction on a bonus, which only ever adds", async () => {
    server.use(...signedIn(), withHolding());
    mount(PATHS.LEDGER_NEW);

    await selectOption(app.ledger.form.account, "Corretora");
    await selectOption(app.ledger.form.asset, "PETR4");
    await selectOption(app.ledger.form.type, app.enums.movementType.BONUS);

    expect(
      await screen.findByLabelText(app.ledger.form.quantityGranted),
    ).toBeVisible();
    expect(
      screen.queryByRole("radio", { name: app.ledger.form.directionLost }),
    ).not.toBeInTheDocument();
  });
});
