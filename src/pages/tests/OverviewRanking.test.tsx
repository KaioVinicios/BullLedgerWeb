/**
 * The realized-gain ranking, over the overview screen it lives on.
 *
 * The ranked counts here are chosen around `LIMIT` — the server's own default
 * of three rows per list — because the rule under test is when the two lists
 * would print the same asset twice.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import {
  PETR_ID,
  VALE_ID,
  overviewHandlers,
} from "@/pages/tests/support/overviewHandlers";

function mount(initialPath: string = PATHS.APP) {
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

const ranking = (count: number) => ({
  reporting_currency: "BRL",
  ranked_assets_count: count,
  best: [
    {
      asset: { id: PETR_ID, name: "PETR4", archetype: "EXCHANGE_SECURITY" },
      monthly_profit_rate: "0.5000000000",
      sales_count: 1,
      profit: { amount: 10_000, currency: "BRL" },
      avg_holding_period_days: 3,
      last_sold_on: "2026-04-10",
    },
  ],
  worst: [
    {
      asset: { id: VALE_ID, name: "VALE3", archetype: "EXCHANGE_SECURITY" },
      monthly_profit_rate: "-0.1000000000",
      sales_count: 2,
      profit: { amount: -4_000, currency: "BRL" },
      avg_holding_period_days: 120,
      last_sold_on: "2026-03-01",
    },
  ],
});

function withRanking(data: unknown) {
  return [
    http.get(`${TEST_API_URL}/api/portfolio/performance/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
    ...overviewHandlers(),
  ];
}

describe("the asset ranking block", () => {
  it("shows the sale count and holding period beside the monthly rate", async () => {
    /* The API applies no minimum holding period, so a three-day trade can
       report 50% a month. The figure is correct and misleading alone; the
       context beside it is the agreed mitigation, not decoration. */
    server.use(...withRanking(ranking(4)));
    mount();

    const row = await screen.findByRole("listitem", { name: /PETR4/ });

    expect(
      within(row).getByText(
        app.overview.ranking.context
          .replace("{{sales}}", "1")
          .replace("{{days}}", "3"),
      ),
    ).toBeVisible();
  });

  it("hides the worst list when the two would overlap", async () => {
    server.use(...withRanking(ranking(2)));
    mount();

    await screen.findByText(app.overview.ranking.best);
    expect(
      screen.queryByText(app.overview.ranking.worst),
    ).not.toBeInTheDocument();
  });

  it("shows both lists when there are enough ranked assets", async () => {
    server.use(...withRanking(ranking(9)));
    mount();

    expect(
      await screen.findByText(app.overview.ranking.worst),
    ).toBeInTheDocument();
  });

  it("says so when no sale has been recorded", async () => {
    server.use(
      ...withRanking({
        reporting_currency: "BRL",
        ranked_assets_count: 0,
        best: [],
        worst: [],
      }),
    );
    mount();

    expect(
      await screen.findByText(app.overview.ranking.empty),
    ).toBeInTheDocument();
  });

  it("states that the measure is realized, rather than leaving it to be inferred", async () => {
    // An asset never sold appears in neither list however well it has done,
    // and an absence explains nothing on its own.
    server.use(...withRanking(ranking(9)));
    mount();

    expect(
      await screen.findByText(app.overview.ranking.realizedOnly),
    ).toBeVisible();
  });
});
