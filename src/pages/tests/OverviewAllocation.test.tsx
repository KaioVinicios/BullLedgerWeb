/**
 * The by-asset allocation block, over the overview screen it lives on.
 *
 * This suite runs on `allocationFixture` — the captured response, not an
 * invented one. That is the point of the first test: Phase 8 shipped a raw
 * translation key for the free-cash slice and every MSW test passed, because
 * every fixture had been written by the client that consumed it.
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
  leanAllocation,
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

describe("the by-asset allocation block", () => {
  it("labels the free-cash slice instead of printing a key", async () => {
    /* Phase 8's regression: `by_archetype` carried a sixth FREE_CASH slice and
       the screen printed the raw translation key, because AllocationSlice.key
       is typed `string` and every fixture was invented. by_asset carries the
       same row, discriminated by a null asset. */
    server.use(...overviewHandlers());
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });

    expect(
      within(table).getByText(app.overview.byAsset.freeCash),
    ).toBeInTheDocument();
    expect(within(table).queryByText(/^overview\./)).not.toBeInTheDocument();
  });

  it("shows market value and invested cost side by side", async () => {
    server.use(...overviewHandlers());
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });

    expect(
      within(table).getByRole("columnheader", {
        name: app.overview.byAsset.value,
      }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: app.overview.byAsset.invested,
      }),
    ).toBeInTheDocument();
  });

  it("lists a row for every slice the server sent", async () => {
    server.use(...overviewHandlers());
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });

    expect(within(table).getAllByRole("row").length).toBe(
      1 + leanAllocation.by_asset.length,
    );
  });

  it("orders the rows largest first, so the chart and the table agree", async () => {
    // The server returns them alphabetically. Two views of one set that
    // disagree on order make the reader re-find their place between them.
    server.use(...overviewHandlers());
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });

    const rendered = within(table)
      .getAllByRole("rowheader")
      .map((cell) => cell.textContent);
    const expected = leanAllocation.by_asset
      .toSorted((a, b) => b.value.amount - a.value.amount)
      .map((slice) => slice.asset?.name ?? app.overview.byAsset.freeCash);

    expect(rendered).toEqual(expected);
  });

  it("keeps an overdrawn cash position rather than clamping it away", async () => {
    /* The stacked bar this replaced ran every weight through `weightToWidth`,
       which floors a negative at 0% — so an overdrawn free-cash row rendered
       as nothing at all while the positive slices summed past 100%. The row
       and its negative figure both have to survive. */
    const overdrawn = {
      ...leanAllocation,
      by_asset: leanAllocation.by_asset.map((slice) =>
        slice.asset === null
          ? {
              ...slice,
              value: { ...slice.value, amount: -50_000 },
              weight: "-0.25",
            }
          : slice,
      ),
    };

    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/allocation/`, () =>
        HttpResponse.json({ status: 200, data: overdrawn }),
      ),
      ...overviewHandlers(),
    );
    mount();

    const table = await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });
    const row = within(table).getByRole("row", {
      name: new RegExp(app.overview.byAsset.freeCash),
    });

    expect(within(row).getByText("-R$500.00")).toBeInTheDocument();
    // Sorted last, because it is the smallest value and not because it is cash.
    expect(within(table).getAllByRole("rowheader").at(-1)).toHaveTextContent(
      app.overview.byAsset.freeCash,
    );
  });

  it("reads the account's own split on its tab", async () => {
    const scopes: (string | null)[] = [];
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/allocation/`, ({ request }) => {
        scopes.push(new URL(request.url).searchParams.get("account"));
        return HttpResponse.json({ status: 200, data: leanAllocation });
      }),
      ...overviewHandlers(),
    );
    mount(`${PATHS.APP}?account=${account.id}`);

    await screen.findByRole("table", {
      name: app.overview.byAsset.tableLabel,
    });

    expect(scopes).toContain(account.id);
  });

  it("keeps the only way into the allocation screen, which the sidebar omits", async () => {
    // The link came across with the archetype block this replaced. Without it
    // `/app/allocation` has no entry point at all.
    server.use(...overviewHandlers());
    mount();

    expect(
      await screen.findByRole("link", { name: app.overview.seeAllocation }),
    ).toHaveAttribute("href", PATHS.ALLOCATION);
  });
});
