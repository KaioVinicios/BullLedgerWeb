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
import type { FxRate } from "@/services/pricing";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const rates: FxRate[] = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    base: "BRL",
    quote: "USD",
    date: "2026-08-02",
    rate: "0.18420",
    source: "MANUAL",
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    base: "BRL",
    quote: "USD",
    date: "2026-08-01",
    rate: "0.18400",
    source: "FEED",
  },
];

function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

function signedInFx(rows: FxRate[]) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/fx-rates/`, () =>
      HttpResponse.json(page(rows)),
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

describe("the FX screen", () => {
  it("marks a manual rate as an override, in words", async () => {
    server.use(...signedInFx(rates));
    mount(PATHS.PRICING_FX);

    expect(await screen.findByText("0.1842")).toBeVisible();
    expect(screen.getByText("0.184")).toBeVisible();

    // Which rate wins is carried by the word, never by the shade.
    expect(screen.getByText(app.enums.priceSource.MANUAL)).toBeVisible();
    expect(screen.getByText(app.enums.priceSource.FEED)).toBeVisible();
  });

  it("explains which rate wins for a date and pair", async () => {
    server.use(...signedInFx(rates));
    mount(PATHS.PRICING_FX);

    expect(await screen.findByText(app.pricing.fx.precedence)).toBeVisible();
    expect(screen.getByText(app.pricing.fx.readOnly)).toBeVisible();
    // The override a user actually has is the per-movement one, and the
    // screen points at it rather than pretending this table is writable.
    expect(screen.getByText(app.pricing.fx.movementOverride)).toBeVisible();
  });

  it("offers no way to write", async () => {
    server.use(...signedInFx(rates));
    mount(PATHS.PRICING_FX);

    await screen.findByText("0.1842");

    // POST /api/fx-rates/ is staff-only and the schema exposes no `is_staff`,
    // so a form here would 403 for essentially every user. The absence is the
    // design decision, so it is what gets asserted.
    //
    // Scoped to the screen rather than the document: the shell's footer links
    // warn "(opens in a new tab)", and an unscoped /new/i matches that.
    const main = within(screen.getByRole("main"));
    expect(
      main.queryByRole("button", { name: /record|add|new|save|create/i }),
    ).not.toBeInTheDocument();
    expect(
      main.queryByRole("link", { name: /record|add|new|create/i }),
    ).not.toBeInTheDocument();
    expect(main.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("drives both currency filters through the URL", async () => {
    server.use(...signedInFx(rates));
    const { router } = mount(PATHS.PRICING_FX);

    await screen.findByText("0.1842");
    await userEvent.click(
      screen.getByRole("combobox", { name: app.pricing.filters.base }),
    );
    await userEvent.click(screen.getByRole("option", { name: "BRL" }));

    expect(router.state.location.search).toMatchObject({ base: "BRL" });
  });

  it("names the empty case per pair", async () => {
    server.use(...signedInFx([]));
    mount(`${PATHS.PRICING_FX}?base=BRL&quote=USD`);

    expect(await screen.findByText(app.pricing.fx.empty.title)).toBeVisible();
  });

  it("does not blame a filter nobody applied", async () => {
    server.use(...signedInFx([]));
    mount(PATHS.PRICING_FX);

    // Found in the live walk: an empty table and an empty filter are
    // different situations, and telling an unfiltered reader to clear their
    // filters is an instruction they cannot follow.
    expect(
      await screen.findByText(app.pricing.fx.empty.unfilteredTitle),
    ).toBeVisible();
    expect(
      screen.queryByText(app.pricing.fx.empty.description),
    ).not.toBeInTheDocument();
  });
});
