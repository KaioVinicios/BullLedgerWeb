/**
 * That writing a target re-reads the projections.
 *
 * `services/tests/targets.test.ts` already proves `invalidateTargets` sweeps
 * both roots. This proves the thing above it: a write driven **through the UI**
 * leaves the overview stale, so a user who creates a target and returns to the
 * overview sees the verdict rather than the absence of one.
 *
 * That matters more here than for any other resource in the app, because a
 * target changes no *figure* the projections carry — only the derived status
 * beside them. Nothing on screen would look wrong if this were broken, which is
 * exactly why it is asserted rather than assumed.
 *
 * Asserted on **cache state**, not on spies — Phase 4's precedent. A spy proves
 * a call was made; cache state proves the user would see a fresh read.
 */
import { describe, expect, it, vi } from "vitest";
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
import { overviewQuery, type PortfolioOverview } from "@/services/portfolio";
import type { Target } from "@/services/targets";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const account: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Binance",
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

const btc: Asset = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "BTC",
  archetype: "CRYPTO",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: "BTC",
  decimals: 8,
  price_currency: "USD",
  chain: "",
};

const target: Target = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: "HOLDING",
  account: account.id,
  asset: btc.id,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      from_month: 0,
      rate: "0.12",
      rate_period: "ANNUAL",
    },
  ],
  archived_at: null,
};

const overview: PortfolioOverview = {
  on_date: "2026-08-04",
  reporting_currency: "BRL",
  total_value: { amount: 1_000_000, currency: "BRL" },
  free_cash: { amount: 0, currency: "BRL" },
  complete: true,
  accounts: [],
  archetypes: [],
  nominal_return: null,
  real_return: null,
  missing: [],
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function signedIn(targets: Target[] = []) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([btc])),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data: overview }),
    ),
    http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
      const scope = new URL(request.url).searchParams.get("scope");
      const rows = scope
        ? targets.filter((row) => row.scope === scope)
        : targets;

      return HttpResponse.json(page(rows));
    }),
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

describe("writing a target", () => {
  it("leaves the projections stale, which is where its only visible effect lives", async () => {
    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/targets/`, () =>
        HttpResponse.json({ status: 201, data: target }, { status: 201 }),
      ),
    );

    const { queryClient } = mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // Seed the overview the way a user arriving from it would have.
    await queryClient.ensureQueryData(overviewQuery());
    expect(
      queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
    ).toBe(false);

    await userEvent.type(
      await screen.findByLabelText(app.targets.form.steps.rate),
      "12",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.create }),
    );

    await vi.waitFor(() =>
      expect(
        queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
      ).toBe(true),
    );
  });

  it("leaves them stale on archive too, because a holding falls back to no status", async () => {
    server.use(
      ...signedIn([target]),
      http.post(`${TEST_API_URL}/api/targets/${target.id}/archive/`, () =>
        HttpResponse.json({
          status: 200,
          data: { ...target, archived_at: "2026-08-04T00:00:00Z" },
        }),
      ),
    );

    const { queryClient } = mount(PATHS.TARGETS);

    await queryClient.ensureQueryData(overviewQuery());

    await userEvent.click(
      await screen.findByRole("button", {
        name: app.structure.openMenu.replace("{{name}}", "BTC · Binance"),
      }),
    );
    await userEvent.click(
      screen.getByRole("menuitem", { name: app.structure.archive }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.structure.archiveDialog.confirm }),
    );

    // A holding whose only target was archived must not keep rendering the
    // verdict that target produced.
    await vi.waitFor(() =>
      expect(
        queryClient.getQueryState(overviewQuery().queryKey)?.isInvalidated,
      ).toBe(true),
    );
  });
});
