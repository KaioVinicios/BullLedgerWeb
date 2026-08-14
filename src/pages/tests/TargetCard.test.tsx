import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { TargetBlock } from "@/pages/Holding/TargetBlock";
import { TargetCard } from "@/pages/Targets/TargetCard";
import { PATHS } from "@/routes/path";
import type { HoldingDetail } from "@/services/portfolio";
import type { Target } from "@/services/targets";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

const names = {
  accountName: (id: string) => (id === ACCOUNT ? "Binance" : id),
  assetName: (id: string) => (id === ASSET ? "BTC" : id),
};

/** A figure the target block never prints; it only has to typecheck. */
const money = { amount: 0, currency: "BRL" as const };

const step = (from_month: number, rate: string) => ({
  id: `step-${from_month}`,
  from_month,
  rate,
  rate_period: "MONTHLY" as const,
});

const portfolio: Target = {
  id: "pppppppp-pppp-4ppp-8ppp-pppppppppppp",
  scope: "PORTFOLIO_ARCHETYPE",
  archetype: "CRYPTO",
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step(0, "0.015")],
  archived_at: null,
};

const holding: Target = {
  id: "hhhhhhhh-hhhh-4hhh-8hhh-hhhhhhhhhhhh",
  scope: "HOLDING",
  account: ACCOUNT,
  asset: ASSET,
  loss_limit_pct: "0.03",
  loss_limit_period: "MONTHLY",
  steps: [step(0, "0.03"), step(3, "0.02")],
  archived_at: null,
};

// The card renders router `<Link>`s, so it needs router context — but nothing
// here navigates, and the app's route tree would drag its loaders in. A
// throwaway two-route router supplies the context instead. `TARGETS_EDIT` has
// to be one of the two: `<Link>` builds its href eagerly, so a router that
// cannot match that path fails at render rather than at click.
//
// `router.load()` before `render`, and therefore async: a freshly created
// router resolves its first match in a promise, so `RouterProvider` paints an
// empty `<div>` on the synchronous pass. The assertions here are mostly about
// what is *not* on the card, and against an unloaded router every one of them
// would pass for the wrong reason.
async function mount(ui: ReactNode) {
  const rootRoute = createRootRoute();
  const routeTree = rootRoute.addChildren([
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => ui,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: PATHS.TARGETS_EDIT,
      component: () => null,
    }),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  await router.load();

  return render(<RouterProvider router={router} />);
}

describe("TargetCard", () => {
  it("reads the whole ladder rather than the first rung and a count", async () => {
    await mount(
      <TargetCard
        target={holding}
        names={names}
        shadowers={[]}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    const line = screen.getByText(/3% monthly/);

    expect(line).toHaveTextContent("2% monthly from month 3 onwards");
    expect(line).toHaveTextContent("a floor of −3% monthly");
    // The old `+N more` affordance specifically, not the word "more": the card
    // states every rung, so there is no remainder left to count. A bare /more/
    // would fail on any future copy that happens to contain the word.
    expect(line.textContent).not.toMatch(/\+\d+ more/);
  });

  it("names what covers part of its reach, without calling it an error", async () => {
    await mount(
      <TargetCard
        target={portfolio}
        names={names}
        shadowers={[holding]}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        app.targets.shadowed_one.replace("{{names}}", "BTC · Binance"),
      ),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("truncates a long list of shadowers to three names", async () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      ...holding,
      id: `h${index}`,
      asset: `asset-${index}`,
    }));

    await mount(
      <TargetCard
        target={portfolio}
        names={names}
        shadowers={many}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    // `exact: false` is a substring match, not `new RegExp(copy)`: the pattern
    // would otherwise be compiled from translated prose, and the day that
    // string gains a `(`, `+` or `.` it silently stops meaning what it reads
    // as.
    const note = screen.getByText(
      app.targets.shadowedMore.replace("{{count}}", "2"),
      { exact: false },
    );

    expect(note).toBeVisible();
    // The truncation itself, which the remainder clause alone does not prove:
    // three names shown, and the fourth is not among them.
    expect(note).toHaveTextContent("asset-2 · Binance");
    expect(note).not.toHaveTextContent("asset-3");
  });

  it("shows no note when nothing covers it", async () => {
    await mount(
      <TargetCard
        target={portfolio}
        names={names}
        shadowers={[]}
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    // The card itself, first: every other assertion in this test is an
    // absence, and an absence proves nothing about a card that never rendered.
    expect(
      screen.getByRole("link", { name: app.enums.archetype.CRYPTO }),
    ).toBeVisible();
    expect(screen.queryByText(/covers part of this reach/)).toBeNull();
  });

  it("reaches archive from the keyboard, with the target named on the trigger", async () => {
    const onArchive = vi.fn();

    await mount(
      <TargetCard
        target={holding}
        names={names}
        shadowers={[]}
        onArchive={onArchive}
        onRestore={vi.fn()}
      />,
    );

    // The name, not "Actions": three of these cards on one screen would
    // otherwise give a screen-reader user three identically named buttons.
    const trigger = screen.getByRole("button", {
      name: app.structure.openMenu.replace("{{name}}", "BTC · Binance"),
    });

    await userEvent.tab();
    expect(screen.getByRole("link", { name: "BTC · Binance" })).toHaveFocus();
    await userEvent.tab();
    expect(trigger).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: app.structure.archive }),
    ).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onArchive).toHaveBeenCalledWith(holding);
  });

  /**
   * The design's load-bearing claim, asserted across two surfaces at once
   * rather than against the bundle twice.
   *
   * Every other test here — and every one in `Holding.test.tsx` — composes its
   * expected string from `en/app.json` independently, which proves each surface
   * says something correct and not that they say the *same* thing. These two
   * are the pair that can genuinely drift: the card renders the sentence
   * through `TargetSentence`'s `line` layout, while `TargetBlock` composes it
   * inline from `describeTarget` + `summarizeClauses` because it sets the prose
   * inside a larger sentence of its own. One fixture, one expected string, and
   * the card's own rendered text is what the block is measured against — so the
   * day one of them grows a formatter the other does not, this fails.
   */
  it("says the same words on the card and on the holding block", async () => {
    const detail: HoldingDetail = {
      account: ACCOUNT,
      asset: ASSET,
      archetype: "CRYPTO",
      on_date: "2026-08-13",
      holding_start: "2025-02-10",
      holding_period_days: 549,
      registration: "BR_TAXABLE",
      tax_advantaged: false,
      reporting_currency: "BRL",
      quantity: "1",
      principal: null,
      current_value: null,
      cost_basis_remaining: { native: money, base: money },
      invested: { native: money, base: money },
      realized_gain: { native: money, base: money },
      unrealized_gain: null,
      income_received: { native: money, base: money },
      costs: { native: money, base: money },
      total_return: null,
      reporting: {
        value: null,
        invested: null,
        realized_gain: null,
        unrealized_gain: null,
        income_received: null,
      },
      real_return: null,
      target: {
        status: "ON_TRACK",
        actual: "0.031",
        expected: "0.03",
        band: "0.005",
        source: { scope: "HOLDING", id: holding.id },
      },
      lots: [],
    };

    server.use(
      http.get(`${TEST_API_URL}/api/targets/${holding.id}/`, () =>
        HttpResponse.json({ status: 200, data: holding }),
      ),
    );

    await mount(
      <QueryClientProvider client={createQueryClient()}>
        {/* A wrapper the queries can be scoped to: both surfaces render the
            same words, so an unscoped query would resolve to two nodes. */}
        <div data-testid="card-surface">
          <TargetCard
            target={holding}
            names={names}
            shadowers={[]}
            onArchive={vi.fn()}
            onRestore={vi.fn()}
          />
        </div>
        <TargetBlock holding={detail} accountName="Binance" />
      </QueryClientProvider>,
    );

    const card = within(screen.getByTestId("card-surface")).getByText(
      /3% monthly/,
    );
    const block = await screen.findByRole("region", {
      name: app.holding.target.title,
    });

    // The block's own line, once the target it names has arrived — the
    // provenance sentence plus the card's sentence, verbatim.
    expect(
      await within(block).findByText(
        app.holding.target.measuredAgainst
          .replace("{{provenance}}", app.holding.target.from.HOLDING)
          .replace("{{sentence}}", card.textContent ?? ""),
      ),
    ).toBeVisible();
  });

  it("offers restore, not archive, once the target is archived", async () => {
    const onRestore = vi.fn();
    const archived: Target = {
      ...holding,
      archived_at: "2026-08-01T00:00:00Z",
    };

    await mount(
      <TargetCard
        target={archived}
        names={names}
        shadowers={[]}
        onArchive={vi.fn()}
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText(app.structure.archivedBadge)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", {
        name: app.structure.openMenu.replace("{{name}}", "BTC · Binance"),
      }),
    );

    expect(
      screen.queryByRole("menuitem", { name: app.structure.archive }),
    ).toBeNull();

    await userEvent.click(
      screen.getByRole("menuitem", { name: app.structure.restore }),
    );
    expect(onRestore).toHaveBeenCalledWith(archived);
  });
});
