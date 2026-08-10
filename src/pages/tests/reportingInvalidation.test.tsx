/**
 * That the projections re-read after anything that changes them.
 *
 * This is `v1-todo.md` 8.4's third item, and the wiring it proves predates the
 * phase: `PORTFOLIO_KEY` has been swept wholesale since Phase 1, and Phases 4
 * through 7 hung `invalidateLedger`, `invalidatePricing`, and the profile save
 * off it. Phase 8 is simply the first phase with figures to read, so what it
 * contributes here is the proof rather than the mechanism.
 *
 * Asserted on **cache state**, not on spies — Phase 4's precedent. A spy proves
 * a call was made; cache state proves the user would see fresh figures.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import {
  contributionLimitKeys,
  contributionLimitsQuery,
} from "@/services/contributionLimits";
import { invalidateLedger } from "@/services/movements";
import {
  allocationQuery,
  holdingQuery,
  overviewQuery,
  type PortfolioOverview,
} from "@/services/portfolio";
import { invalidatePricing } from "@/services/pricing";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";

const money = (amount: number, currency: "BRL" | "USD") => ({
  amount,
  currency,
});

function overviewIn(currency: "BRL" | "USD", total: number): PortfolioOverview {
  return {
    on_date: "2026-08-03",
    reporting_currency: currency,
    total_value: money(total, currency),
    free_cash: money(0, currency),
    complete: true,
    accounts: [
      {
        account: ACCOUNT_ID,
        cash: money(0, currency),
        subtotal: money(total, currency),
        complete: true,
        holdings: [
          {
            account: ACCOUNT_ID,
            asset: ASSET_ID,
            archetype: "EXCHANGE_SECURITY",
            quantity: "100",
            cost_basis_remaining_native: money(total, currency),
            current_value_native: money(total, currency),
            value: money(total, currency),
            invested: money(total, currency),
            realized_gain: money(0, currency),
            unrealized_gain: money(0, currency),
            income_received: money(0, currency),
            total_return: "0",
            complete: true,
            target_status: null,
          },
        ],
      },
    ],
    archetypes: [],
    nominal_return: null,
    real_return: null,
    missing: [],
  };
}

const emptyPage = {
  status: 200,
  data: { count: 0, next: null, previous: null, results: [] },
};

function projectionHandlers() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data: overviewIn("BRL", 48_235_000) }),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/allocation/`, () =>
      HttpResponse.json({
        status: 200,
        data: {
          on_date: "2026-08-03",
          reporting_currency: "BRL",
          total_value: money(48_235_000, "BRL"),
          complete: true,
          by_archetype: [],
          by_currency: [],
          by_country: [],
          missing: [],
        },
      }),
    ),
    http.get(
      `${TEST_API_URL}/api/portfolio/holdings/${ACCOUNT_ID}/${ASSET_ID}/`,
      () =>
        HttpResponse.json({
          status: 200,
          data: {
            account: ACCOUNT_ID,
            asset: ASSET_ID,
            archetype: "EXCHANGE_SECURITY",
            on_date: "2026-08-03",
            holding_start: null,
            holding_period_days: null,
            registration: "BR_TAXABLE",
            tax_advantaged: false,
            reporting_currency: "BRL",
            quantity: "100",
            principal: null,
            current_value: null,
            cost_basis_remaining: {
              native: money(0, "BRL"),
              base: money(0, "BRL"),
            },
            invested: { native: money(0, "BRL"), base: money(0, "BRL") },
            realized_gain: { native: money(0, "BRL"), base: money(0, "BRL") },
            unrealized_gain: null,
            income_received: { native: money(0, "BRL"), base: money(0, "BRL") },
            costs: { native: money(0, "BRL"), base: money(0, "BRL") },
            total_return: null,
            reporting: {
              value: null,
              invested: null,
              realized_gain: null,
              unrealized_gain: null,
              income_received: null,
            },
            real_return: null,
            target: null,
            lots: [],
          },
        }),
    ),
    http.get(`${TEST_API_URL}/api/contribution-limits/`, () =>
      HttpResponse.json(emptyPage),
    ),
  ];
}

describe("projections re-read after a mutation", () => {
  it("marks the overview stale when a movement is recorded", async () => {
    server.use(...projectionHandlers());
    const queryClient = createQueryClient();

    await queryClient.ensureQueryData(overviewQuery());
    expect(
      queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
    ).toBe(false);

    await invalidateLedger(queryClient);

    expect(
      queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
    ).toBe(true);
  });

  it("marks the allocation and the holding stale too", async () => {
    server.use(...projectionHandlers());
    const queryClient = createQueryClient();

    await queryClient.ensureQueryData(allocationQuery());
    await queryClient.ensureQueryData(holdingQuery(ACCOUNT_ID, ASSET_ID));

    await invalidateLedger(queryClient);

    // One rule, one root: nothing here is invalidated by a rule of its own.
    expect(
      queryClient.getQueryState(allocationQuery().queryKey)?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(holdingQuery(ACCOUNT_ID, ASSET_ID).queryKey)
        ?.isInvalidated,
    ).toBe(true);
  });

  it("marks them stale when a price is recorded", async () => {
    server.use(...projectionHandlers());
    const queryClient = createQueryClient();

    await queryClient.ensureQueryData(overviewQuery());
    await queryClient.ensureQueryData(allocationQuery());

    await invalidatePricing(queryClient);

    expect(
      queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(allocationQuery().queryKey)?.isInvalidated,
    ).toBe(true);
  });

  it("leaves the contribution limits alone, because no mutation can change them", async () => {
    server.use(...projectionHandlers());
    const queryClient = createQueryClient();

    const key = contributionLimitKeys.list({ page: 1 });
    await queryClient.ensureQueryData(contributionLimitsQuery({ page: 1 }));

    await invalidateLedger(queryClient);
    await invalidatePricing(queryClient);

    // Reference data sits outside PORTFOLIO_KEY on purpose: a yearly data load
    // is not something a user's own writing can change.
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  });
});

describe("a reporting-currency change", () => {
  it("re-renders every figure together, from the server's own numbers", async () => {
    let reportingCurrency: "BRL" | "USD" = "BRL";

    server.use(
      http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(emptyPage),
      ),
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(emptyPage),
      ),
      // The same portfolio, valued in whichever currency the profile now says.
      // Both figures come from the server; the client converts nothing.
      http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
        HttpResponse.json({
          status: 200,
          data:
            reportingCurrency === "BRL"
              ? overviewIn("BRL", 48_235_000)
              : overviewIn("USD", 8_860_000),
        }),
      ),
    );

    const queryClient = createQueryClient();
    const router = createAppRouter({
      queryClient,
      history: createMemoryHistory({ initialEntries: [PATHS.APP] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Every BRL figure on the screen — the total, the subtotal, the row — not
    // just the headline, because "together" is the whole claim.
    const before = await screen.findAllByText("R$482,350.00");
    expect(before.length).toBeGreaterThan(1);

    // What the profile screen's save does, without driving its form: change
    // the preference, then sweep the root every projection lives under.
    reportingCurrency = "USD";
    await queryClient.invalidateQueries({ queryKey: ["portfolio"] });

    const after = await screen.findAllByText("$88,600.00");
    expect(after).toHaveLength(before.length);

    // No figure is left in the old currency: a screen showing both at once
    // would be showing one of them wrong.
    expect(screen.queryByText("R$482,350.00")).not.toBeInTheDocument();
  });
});
