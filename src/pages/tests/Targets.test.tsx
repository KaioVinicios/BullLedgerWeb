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

const existing: Target = {
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

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

/**
 * The list makes one request per section plus one for the "is anything here at
 * all" count, so the handler answers by `scope`: rows only for the level they
 * belong to, and the whole set when no scope is asked for.
 */
function signedIn(targets: Target[] = []) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([btc])),
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

describe("the targets list", () => {
  it("renders one section per level, in resolution order", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    await screen.findByText("BTC · Binance");
    const headings = screen.getAllByRole("heading", { level: 2 });

    expect(headings.map((node) => node.textContent)).toEqual([
      app.enums.targetScope.HOLDING,
      app.enums.targetScope.ACCOUNT_ARCHETYPE,
      app.enums.targetScope.PORTFOLIO_ARCHETYPE,
    ]);
  });

  it("states the resolution rule, because the sections alone only imply it", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    expect(await screen.findByText(app.targets.resolution)).toBeVisible();
  });

  it("names a target by its scope, since a target has no name of its own", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    expect(await screen.findByText("BTC · Binance")).toBeVisible();
  });

  it("leads the steps column with the rate rather than a count", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    expect(
      await screen.findByText(
        app.targets.stepSummary
          .replace("{{rate}}", "12%")
          .replace("{{period}}", app.enums.period.ANNUAL)
          .replace("{{month}}", "0"),
      ),
    ).toBeVisible();
  });

  it("keeps an empty level visible rather than dropping the lesson", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    await screen.findByText("BTC · Binance");

    // Two of the three levels are empty; both still say so.
    expect(screen.getAllByText(app.targets.sectionEmpty)).toHaveLength(2);
  });

  it("shows the full empty state only when every level is empty", async () => {
    server.use(...signedIn());
    mount(PATHS.TARGETS);

    expect(await screen.findByText(app.targets.empty.title)).toBeVisible();
    expect(
      screen.queryByText(app.targets.sectionEmpty),
    ).not.toBeInTheDocument();
  });

  it("paginates each level on its own URL parameter", async () => {
    // Two pages needs a count above PAGE_SIZE — below it `ListPagination`
    // renders nothing, which is the behaviour every other list relies on.
    const many = Array.from({ length: 60 }, (_, index) => ({
      ...existing,
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`,
    }));

    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        const scope = new URL(request.url).searchParams.get("scope");

        // The screen makes three scoped requests plus one unscoped count.
        // Only the holding level has a second page; the other two are empty,
        // or they would each grow a pagination control of their own.
        if (scope === null) return HttpResponse.json(page([], 60));
        if (scope !== "HOLDING") return HttpResponse.json(page([]));

        return HttpResponse.json({
          status: 200,
          data: {
            count: 60,
            next: `${TEST_API_URL}/api/targets/?page=2`,
            previous: null,
            results: many.slice(0, 50),
          },
        });
      }),
      ...signedIn(many),
    );

    const { router } = mount(PATHS.TARGETS);

    await screen.findAllByText("BTC · Binance");
    await userEvent.click(
      screen.getByRole("button", { name: app.structure.pagination.next }),
    );

    expect(router.state.location.search).toMatchObject({ holdingPage: 2 });
  });

  it("archives through the shared confirmation, worded as archival", async () => {
    let archived = false;

    server.use(
      ...signedIn([existing]),
      http.post(`${TEST_API_URL}/api/targets/${existing.id}/archive/`, () => {
        archived = true;

        return HttpResponse.json({
          status: 200,
          data: { ...existing, archived_at: "2026-08-04T00:00:00Z" },
        });
      }),
    );
    mount(PATHS.TARGETS);

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

    await screen.findByText(app.targets.archived);
    expect(archived).toBe(true);
  });

  it("offers no sortable header, because the endpoint declares no ordering", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    await screen.findByText("BTC · Binance");

    for (const header of screen.getAllByRole("columnheader")) {
      expect(within(header).queryByRole("button")).toBeNull();
    }
  });
});
