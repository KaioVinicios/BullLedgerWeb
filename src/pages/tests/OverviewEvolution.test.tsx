/**
 * The monthly evolution block, over the overview screen it lives on.
 *
 * Mounted through the real route rather than in isolation, because the block
 * reads its scope from the tab strip above it — testing it detached would
 * prove the table renders and nothing about the thing it is for.
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
  account,
  leanForecast,
  leanHistory,
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

describe("the monthly evolution block", () => {
  it("plots the months and lists them in the table beside the chart", async () => {
    server.use(...overviewHandlers());
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.evolution.tableLabel,
    });

    // Header plus one row per captured month.
    expect(within(table).getAllByRole("row").length).toBe(
      1 + leanHistory.points.length + leanForecast.points.length,
    );
  });

  it("shows a month it could not value as a dash, never as zero", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/history/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            reporting_currency: "BRL",
            points: [
              {
                month: "2026-01",
                as_of: "2026-01-31",
                partial: false,
                total_value: null,
                invested: null,
                gain: null,
                net_flow: { amount: 0, currency: "BRL" },
                monthly_return: null,
                complete: false,
              },
            ],
          },
        }),
      ),
      ...overviewHandlers(),
    );
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.evolution.tableLabel,
    });
    const row = within(table).getByRole("row", { name: /2026-01/ });

    expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
    // The net flow is a real R$0.00; the value and the return are not zero,
    // they are absent, and printing a zero for them would be a lie.
    expect(within(row).getAllByText("R$0.00")).toHaveLength(1);
  });

  it("explains an insufficient history instead of drawing an empty forecast", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/forecast/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            reporting_currency: "BRL",
            monthly_rate: null,
            volatility: null,
            sample_months: 3,
            points: [],
            unavailable_reason: "INSUFFICIENT_HISTORY",
          },
        }),
      ),
      ...overviewHandlers(),
    );
    mount();

    expect(
      await screen.findByText(
        app.overview.evolution.insufficient_other.replace("{{count}}", "3"),
      ),
    ).toBeVisible();
  });

  it("does not claim 6 months are needed when the sample already has more", async () => {
    // `INSUFFICIENT_HISTORY` is also what the API returns when the months are
    // there but one of them wiped the capital out, leaving the geometric mean
    // with no real root. Reusing the short-history sentence there would print
    // "based on 13 months; 6 are needed", which contradicts itself.
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/forecast/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            reporting_currency: "BRL",
            monthly_rate: null,
            volatility: null,
            sample_months: 13,
            points: [],
            unavailable_reason: "INSUFFICIENT_HISTORY",
          },
        }),
      ),
      ...overviewHandlers(),
    );
    mount();

    expect(
      await screen.findByText(
        app.overview.evolution.noRate.replace("{{count}}", "13"),
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(
        app.overview.evolution.insufficient_other.replace("{{count}}", "13"),
      ),
    ).not.toBeInTheDocument();
  });

  it("says a history with no valued month cannot be drawn", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/history/`, () =>
        HttpResponse.json({
          status: 200,
          data: { reporting_currency: "BRL", points: [] },
        }),
      ),
      http.get(`${TEST_API_URL}/api/portfolio/forecast/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            reporting_currency: "BRL",
            monthly_rate: null,
            volatility: null,
            sample_months: 0,
            points: [],
            unavailable_reason: "NOT_VALUED",
          },
        }),
      ),
      ...overviewHandlers(),
    );
    mount();

    expect(
      await screen.findByText(app.overview.evolution.notValued),
    ).toBeVisible();
  });

  it("reads the account's own history on its tab", async () => {
    const scopes: (string | null)[] = [];
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/history/`, ({ request }) => {
        scopes.push(new URL(request.url).searchParams.get("account"));
        return HttpResponse.json({ status: 200, data: leanHistory });
      }),
      ...overviewHandlers(),
    );
    mount(`${PATHS.APP}?account=${account.id}`);

    await screen.findByRole("table", {
      name: app.overview.evolution.tableLabel,
    });

    expect(scopes).toContain(account.id);
  });
});
