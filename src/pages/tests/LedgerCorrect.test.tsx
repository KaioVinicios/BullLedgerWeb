import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

const buy: Movement = {
  id: "33333333-3333-4333-8333-333333333333",
  account: account.id,
  asset: security.id,
  lot: null,
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

const successor: Movement = {
  ...buy,
  id: "44444444-4444-4444-8444-444444444444",
  quantity_delta: "12",
  replaces: buy.id,
};

const voided: Movement = {
  ...buy,
  id: "55555555-5555-4555-8555-555555555555",
  voided_at: "2026-03-05T09:00:00Z",
};

/**
 * The **departing** leg, exactly as the API serves it: `transfer_of` is null.
 * The pairing is one-directional — the arriving leg points at this one and
 * this one points nowhere — so a screen reading `transfer_of` alone would
 * treat this as an ordinary movement and offer a correction the server
 * refuses. Found by the Phase 6 live walk.
 */
const transferLeg: Movement = {
  ...buy,
  id: "66666666-6666-4666-8666-666666666666",
  asset: null,
  type: "TRANSFER_OUT",
  quantity_delta: null,
  unit_price: null,
  fee: null,
  cash_delta: { amount: -50_000, currency: "BRL" },
  transfer_of: null,
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function signedIn(...movements: Movement[]) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([security])),
    ),
    http.get(`${TEST_API_URL}/api/movement-types/`, () =>
      HttpResponse.json({ status: 200, data: MOVEMENT_TYPE_SPECS }),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
      const voidedShown =
        new URL(request.url).searchParams.get("include_voided") === "true";

      return HttpResponse.json(
        page(
          movements.filter(
            (movement) => voidedShown || movement.voided_at === null,
          ),
        ),
      );
    }),
    ...movements.map((movement) =>
      http.get(`${TEST_API_URL}/api/movements/${movement.id}/`, () =>
        HttpResponse.json({ status: 200, data: movement }),
      ),
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

const correctPath = (movement: Movement) =>
  PATHS.LEDGER_CORRECT.replace("$id", movement.id);

/** Opens the row menu and picks the void action on it. */
async function openVoidDialog(movement: Movement) {
  const row = (
    await screen.findByText(app.enums.movementType[movement.type])
  ).closest("tr")!;

  await userEvent.click(
    within(row).getByRole("button", { name: /Actions for/ }),
  );
  await userEvent.click(
    await screen.findByRole("menuitem", { name: app.ledger.void.action }),
  );
}

describe("correcting a movement", () => {
  it("says what recording a correction will do, before it is recorded", async () => {
    server.use(...signedIn(buy));
    mount(correctPath(buy));

    // Not in a tooltip, not after submit: the user is about to create a
    // second row and void the first.
    expect(await screen.findByText(app.ledger.correct.banner)).toBeVisible();
    expect(
      screen.getByRole("button", { name: app.ledger.form.save }),
    ).toBeVisible();
  });

  it("prefills the original's figures as magnitudes", async () => {
    server.use(...signedIn(buy));
    mount(correctPath(buy));

    // -204.00 on the wire is "204.00" here, because every input on this form
    // asks for a magnitude and the shape re-applies the sign.
    expect(
      await screen.findByLabelText(app.ledger.form.amountPaid),
    ).toHaveValue("204");
    expect(screen.getByLabelText(app.ledger.form.quantityAcquired)).toHaveValue(
      "10",
    );
    expect(screen.getByLabelText(app.ledger.form.fee)).toHaveValue("10");
  });

  it("POSTs to replace and lands on the successor", async () => {
    let replaced: string | undefined;

    server.use(
      ...signedIn(buy),
      http.post(
        `${TEST_API_URL}/api/movements/${buy.id}/replace/`,
        ({ request }) => {
          replaced = new URL(request.url).pathname;
          return HttpResponse.json({ status: 200, data: successor });
        },
      ),
      http.get(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(page([successor])),
      ),
    );

    const { router } = mount(correctPath(buy));

    const quantity = await screen.findByLabelText(
      app.ledger.form.quantityAcquired,
    );
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "12");
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.form.save }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.LEDGER),
    );
    // The original is not gone; it is voided, and this is its successor.
    expect(replaced).toBe(`/api/movements/${buy.id}/replace/`);
  });

  it("renders read-only for a movement that is already voided", async () => {
    server.use(...signedIn(voided));
    mount(correctPath(voided));

    expect(
      await screen.findByText(/This movement was voided on/),
    ).toBeVisible();
    // The server answers `movement_already_voided`, so offering the control
    // would be a lie.
    expect(
      screen.queryByRole("button", { name: app.ledger.form.save }),
    ).not.toBeInTheDocument();
  });

  it("renders read-only for a transfer leg, and offers the void instead", async () => {
    server.use(...signedIn(transferLeg));
    mount(correctPath(transferLeg));

    expect(
      await screen.findByText(app.ledger.correct.readOnlyTransferLeg),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: app.ledger.form.save }),
    ).not.toBeInTheDocument();
    // `movement_transfer_not_replaceable` — voiding the pair is the way
    // forward, so that is what the screen offers.
    expect(
      screen.getByRole("button", { name: app.ledger.void.action }),
    ).toBeVisible();
  });
});

describe("voiding a movement", () => {
  it("is called voiding, and says the record survives", async () => {
    server.use(...signedIn(buy));
    mount(PATHS.LEDGER);
    await openVoidDialog(buy);

    expect(
      await screen.findByRole("alertdialog", { name: app.ledger.void.title }),
    ).toBeVisible();
    expect(screen.getByText(app.ledger.void.description)).toBeVisible();
    expect(
      screen.getByRole("button", { name: app.ledger.void.confirm }),
    ).toBeVisible();
  });

  it("warns that both legs go when the row is a transfer leg", async () => {
    server.use(...signedIn(transferLeg));
    mount(PATHS.LEDGER);
    await openVoidDialog(transferLeg);

    // The server voids the pair, so the dialog must not describe a
    // single-row action.
    expect(
      await screen.findByText(app.ledger.void.transferDescription),
    ).toBeVisible();
  });

  it("explains a lot still in use rather than failing generically", async () => {
    server.use(
      ...signedIn(buy),
      http.post(`${TEST_API_URL}/api/movements/${buy.id}/void/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              lot: [
                "This entry's lot still has live exits. Void those movements first.",
              ],
            },
            codes: { lot: ["movement_lot_in_use"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount(PATHS.LEDGER);
    await openVoidDialog(buy);
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.void.confirm }),
    );

    // Recoverable guidance in the dialog, not "something went wrong" in a
    // toast: the server's sentence names an action the user can take.
    expect(await screen.findByText(/still has live exits/)).toBeVisible();
  });

  it("removes the row from the default list and keeps it under the toggle", async () => {
    let isVoided = false;

    server.use(
      // Ahead of `signedIn`'s own list handler: MSW answers with the first
      // match, and this is the one that has to change as the test goes.
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        const shown =
          new URL(request.url).searchParams.get("include_voided") === "true";
        const row = isVoided
          ? { ...buy, voided_at: "2026-03-05T09:00:00Z" }
          : buy;

        return HttpResponse.json(page(isVoided && !shown ? [] : [row]));
      }),
      ...signedIn(buy),
      http.post(`${TEST_API_URL}/api/movements/${buy.id}/void/`, () => {
        isVoided = true;
        return HttpResponse.json({
          status: 200,
          data: { ...buy, voided_at: "2026-03-05T09:00:00Z" },
        });
      }),
    );

    mount(PATHS.LEDGER);
    await openVoidDialog(buy);
    await userEvent.click(
      screen.getByRole("button", { name: app.ledger.void.confirm }),
    );

    await waitFor(() =>
      expect(screen.getByText(app.ledger.empty.title)).toBeVisible(),
    );

    // Nothing was deleted: it is one toggle away.
    await userEvent.click(
      screen.getByRole("switch", { name: app.ledger.showVoided }),
    );
    expect(await screen.findByText(app.ledger.voidedBadge)).toBeVisible();
  });
});
