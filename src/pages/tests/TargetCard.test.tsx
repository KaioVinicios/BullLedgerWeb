import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import app from "@/i18n/locales/en/app.json";
import { TargetCard } from "@/pages/Targets/TargetCard";
import { PATHS } from "@/routes/path";
import type { Target } from "@/services/targets";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

const names = {
  accountName: (id: string) => (id === ACCOUNT ? "Binance" : id),
  assetName: (id: string) => (id === ASSET ? "BTC" : id),
};

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
