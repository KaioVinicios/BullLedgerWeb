import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import ptApp from "@/i18n/locales/pt/app.json";
import i18n from "@/i18n/config";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Asset } from "@/services/assets";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

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

/**
 * An accrual-priced asset, which the server values from its own rate rather
 * than from a quote. It must never reach the picker.
 */
const savings: Asset = {
  id: "88888888-8888-4888-8888-888888888888",
  name: "Poupança Banco X",
  archetype: "CASH_DEPOSIT",
  currency: "BRL",
  country: "BR",
  pricing_mode: "ACCRUAL",
  archived_at: null,
  rate_type: "FLOATING",
  rate_index: "CDI",
  compounding: "DAILY",
  deposit_insurance: "FGC",
  liquidity: "IMMEDIATE",
  rate_value: "1.0",
};

function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

function signedInWith(assets: Asset[]) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page(assets)),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([])),
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

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the quote form", () => {
  it("offers only assets the server can price", async () => {
    server.use(...signedInWith([petr, savings]));
    mount(PATHS.PRICING_NEW);

    await userEvent.click(
      await screen.findByRole("combobox", { name: app.pricing.form.asset }),
    );

    expect(screen.getByRole("option", { name: "PETR4" })).toBeVisible();
    // `pricing_mode` is the server's own read-only discriminator, so an
    // accrual-priced asset is unofferable by construction rather than by
    // rejection — and no archetype list is restated here to say so.
    expect(
      screen.queryByRole("option", { name: savings.name }),
    ).not.toBeInTheDocument();
  });

  // The other end of "unofferable by construction": a portfolio of nothing but
  // accrual assets leaves this list empty, and the field said so by opening a
  // blank panel over itself.
  it("closes the picker when no asset can carry a quote", async () => {
    server.use(...signedInWith([savings]));
    mount(PATHS.PRICING_NEW);

    const asset = await screen.findByRole("combobox", {
      name: app.pricing.form.asset,
    });

    expect(asset).toBeDisabled();
    expect(asset).toHaveTextContent(app.pricing.form.assetEmpty);
    // The hint is unchanged and still says which assets do carry one.
    expect(asset).toHaveAccessibleDescription(app.pricing.form.assetHint);

    await userEvent.click(asset);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("prefills the asset the coverage block sent it", async () => {
    server.use(...signedInWith([petr, savings]));
    mount(`${PATHS.PRICING_NEW}?asset=${petr.id}`);

    expect(
      await screen.findByRole("combobox", { name: app.pricing.form.asset }),
    ).toHaveTextContent("PETR4");
  });

  it("ignores a prefill the server would reject", async () => {
    server.use(...signedInWith([petr, savings]));
    mount(`${PATHS.PRICING_NEW}?asset=${savings.id}`);

    // An ACCRUAL asset cannot carry a quote. Pre-selecting it would stage a
    // rejection; leaving the field empty asks the question honestly.
    expect(
      await screen.findByRole("combobox", { name: app.pricing.form.asset }),
    ).not.toHaveTextContent(savings.name);
  });

  it("sends a price typed in the reader's locale as a canonical decimal", async () => {
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/price-quotes/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            status: 201,
            data: {
              id: "55555555-5555-4555-8555-555555555555",
              asset: petr.id,
              date: "2026-08-02",
              price: "19.40",
              price_source: "MANUAL",
            },
          },
          { status: 201 },
        );
      }),
      ...signedInWith([petr]),
    );

    await i18n.changeLanguage("pt");
    mount(`${PATHS.PRICING_NEW}?asset=${petr.id}`);

    await userEvent.type(
      await screen.findByLabelText(ptApp.pricing.form.price),
      "19,40",
    );
    await userEvent.click(
      screen.getByRole("button", { name: ptApp.pricing.form.create }),
    );

    // The number system the reader types in is not the one the wire speaks.
    // Phase 6 hit this from the other direction — a canonical 19.40 prefilled
    // into a pt-BR parser reads as one thousand nine hundred and forty.
    await waitFor(() =>
      expect(body).toMatchObject({ asset: petr.id, price: "19.40" }),
    );
  });

  it("puts a duplicate rejection in the banner, where the user can read it", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/price-quotes/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              non_field_errors: [
                "The fields asset, date must make a unique set.",
              ],
            },
            codes: { non_field_errors: ["unique"] },
          },
          { status: 400 },
        ),
      ),
      ...signedInWith([petr]),
    );

    mount(`${PATHS.PRICING_NEW}?asset=${petr.id}`);

    await userEvent.type(
      await screen.findByLabelText(app.pricing.form.price),
      "34.10",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.pricing.form.create }),
    );

    // Insert-only: a second value for a date that already has one is a 400,
    // not an overwrite. The exact shape the live API returns, so the user is
    // told rather than left watching a submit do nothing.
    expect(await screen.findByText(/unique set/)).toBeVisible();
  });

  it("lands a field rejection on its own input", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/price-quotes/`, () =>
        HttpResponse.json(
          {
            status: 400,
            // `message` is not decoration: `isApiErrorBody` requires it, and a
            // body without one is treated as malformed and reported
            // generically — which is the right call against a Django debug
            // page, and the reason this fixture mirrors the live shape.
            message: "Invalid input.",
            errors: { date: ["Enter a valid date."] },
            codes: { date: ["invalid"] },
          },
          { status: 400 },
        ),
      ),
      ...signedInWith([petr]),
    );

    mount(`${PATHS.PRICING_NEW}?asset=${petr.id}`);

    await userEvent.type(
      await screen.findByLabelText(app.pricing.form.price),
      "34.10",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.pricing.form.create }),
    );

    expect(await screen.findByText("Enter a valid date.")).toBeVisible();
  });
});
