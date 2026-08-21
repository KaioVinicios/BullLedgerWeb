import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import explain from "@/i18n/locales/en/explain.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { PortfolioOverview } from "@/services/portfolio";
import {
  ACCOUNT_ID,
  BRL,
  PETR_ID,
  account,
  closedHolding,
  insightsHandlers,
  overview,
  page,
  petr,
  hash,
  vale,
  user,
} from "@/pages/tests/support/overviewHandlers";

function signedIn(data: PortfolioOverview = overview) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([petr, hash, vale])),
    ),
    ...insightsHandlers(),
  ];
}

/**
 * A portfolio with history and nothing held: every position closed, no cash.
 *
 * The counted endpoints are what `FirstRun` reads, and they are non-zero here
 * on purpose — this user did every setup step. What they no longer have is a
 * position, which is a different thing from never having started.
 */
function closedOnlyPortfolio() {
  const counted = (count: number) => ({
    status: 200,
    data: { count, next: null, previous: null, results: [] },
  });

  const data: PortfolioOverview = {
    ...overview,
    total_value: BRL(0),
    free_cash: BRL(0),
    complete: true,
    accounts: [
      {
        account: ACCOUNT_ID,
        cash: BRL(0),
        subtotal: BRL(0),
        complete: true,
        nominal_return: null,
        real_return: null,
        holdings: [closedHolding],
      },
    ],
    archetypes: [],
    missing: [],
  };

  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data }),
    ),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(counted(1)),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([petr, hash, vale])),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, () =>
      HttpResponse.json(counted(2)),
    ),
    ...insightsHandlers(),
  ];
}

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

/** An overview with nothing in it, plus counts for the four setup steps. */
function emptyPortfolio(counts: {
  institutions: number;
  accounts: number;
  assets: number;
  movements: number;
}) {
  const empty: PortfolioOverview = {
    ...overview,
    total_value: BRL(0),
    free_cash: BRL(0),
    complete: true,
    accounts: [],
    archetypes: [],
    nominal_return: null,
    real_return: null,
    missing: [],
  };

  const counted = (count: number) => ({
    status: 200,
    data: { count, next: null, previous: null, results: [] },
  });

  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
      HttpResponse.json({ status: 200, data: empty }),
    ),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(counted(counts.institutions)),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(counted(counts.accounts)),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(counted(counts.assets)),
    ),
    http.get(`${TEST_API_URL}/api/movements/`, () =>
      HttpResponse.json(counted(counts.movements)),
    ),
    ...insightsHandlers(),
  ];
}

describe("first run", () => {
  it("names the next action rather than reporting an absence", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 0,
        accounts: 0,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByRole("link", {
        name: app.overview.firstRun.institution.action,
      }),
    ).toHaveAttribute("href", PATHS.INSTITUTIONS_NEW);
  });

  it("moves the call to action to the first step still undone", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 1,
        accounts: 1,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByRole("link", {
        name: app.overview.firstRun.asset.action,
      }),
    ).toHaveAttribute("href", PATHS.ASSETS_NEW);

    // Exactly one action: offering step four before step one is offering a
    // form that cannot be submitted.
    expect(
      screen.queryByRole("link", {
        name: app.overview.firstRun.institution.action,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: app.overview.firstRun.movement.action,
      }),
    ).not.toBeInTheDocument();
  });

  it("marks a finished step with a word, not only an icon", async () => {
    server.use(
      ...emptyPortfolio({
        institutions: 1,
        accounts: 0,
        assets: 0,
        movements: 0,
      }),
    );
    mount();

    expect(
      await screen.findByText(app.overview.firstRun.institution.done),
    ).toBeVisible();
  });

  it("does not appear once there is anything to report", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByText("R$482,350.00");
    expect(
      screen.queryByText(app.overview.firstRun.title),
    ).not.toBeInTheDocument();
  });
});

/** Clicks into the account's own tab, which is where its holdings now live. */
async function openAccountTab() {
  await userEvent.click(await screen.findByRole("tab", { name: account.name }));
}

describe("the overview's scope tabs", () => {
  it("opens on the General tab with no account in the URL", async () => {
    server.use(...signedIn());
    const { router } = mount();

    expect(
      await screen.findByRole("tab", { name: app.overview.tabs.general }),
    ).toHaveAttribute("data-state", "active");
    expect(router.state.location.search).toEqual({});
  });

  it("does not list the account groups on General", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByRole("tab", { name: app.overview.tabs.general });

    // The tab strip names the account; only its holdings block is absent.
    expect(
      screen.queryByRole("region", { name: /Corretora XP/ }),
    ).not.toBeInTheDocument();
  });

  it("moves the account's holdings into its own tab", async () => {
    server.use(...signedIn());
    const { router } = mount();

    await openAccountTab();

    expect(await screen.findByText("PETR4")).toBeVisible();
    expect(router.state.location.search).toEqual({ account: ACCOUNT_ID });
  });

  it("returns to General by dropping the parameter, not by setting a value", async () => {
    server.use(...signedIn());
    const { router } = mount();

    await openAccountTab();
    await userEvent.click(
      screen.getByRole("tab", { name: app.overview.tabs.general }),
    );

    expect(router.state.location.search).toEqual({});
  });

  it("falls back to General when the URL names an account that is gone", async () => {
    server.use(...signedIn());
    mount(`${PATHS.APP}?account=99999999-9999-4999-8999-999999999999`);

    expect(
      await screen.findByRole("tab", { name: app.overview.tabs.general }),
    ).toHaveAttribute("data-state", "active");
    expect(
      screen.queryByRole("region", { name: /Corretora XP/ }),
    ).not.toBeInTheDocument();
  });

  it("restores the account's tab from the address bar", async () => {
    server.use(...signedIn());
    mount(`${PATHS.APP}?account=${ACCOUNT_ID}`);

    expect(
      await screen.findByRole("tab", { name: account.name }),
    ).toHaveAttribute("data-state", "active");
    expect(await screen.findByText("PETR4")).toBeVisible();
  });

  it("reports the account's own figures on its tab, not the portfolio's", async () => {
    // A tab claiming one account while showing the whole portfolio's total
    // would have the figures contradict the control above them.
    server.use(...signedIn());
    mount();

    await openAccountTab();

    // Twice over: once as the tab's headline figure, once as the group's own
    // subtotal beneath it. The portfolio's total is what must be gone.
    expect((await screen.findAllByText("R$291,400.00")).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("R$482,350.00")).not.toBeInTheDocument();
  });
});

describe("the scope control on a narrow viewport", () => {
  /**
   * Reports the viewport as narrow to `useIsMobile`, which reads the app's own
   * breakpoint. `setupTests.ts` stubs `matchMedia` to answer `false` to
   * everything; this narrows that answer to the one query under test rather
   * than replacing the stub wholesale.
   */
  function reportNarrowViewport() {
    const original = window.matchMedia;

    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("max-width"),
    })) as typeof window.matchMedia;

    return () => {
      window.matchMedia = original;
    };
  }

  let restore = () => {};
  beforeEach(() => {
    restore = reportNarrowViewport();
  });
  afterEach(() => restore());

  it("offers one control instead of a strip that scrolls out of reach", async () => {
    server.use(...signedIn());
    mount();

    // The whole point: no horizontally scrolling row of tabs on a phone.
    expect(
      await screen.findByRole("combobox", { name: app.overview.tabs.label }),
    ).toBeVisible();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("names the open scope in full rather than truncating it", async () => {
    server.use(...signedIn());
    mount();

    const control = await screen.findByRole("combobox", {
      name: app.overview.tabs.label,
    });

    expect(control).toHaveTextContent(app.overview.tabs.general);
  });

  it("switches scope, and writes it to the URL like the tabs do", async () => {
    server.use(...signedIn());
    const { router } = mount();

    await userEvent.click(
      await screen.findByRole("combobox", { name: app.overview.tabs.label }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: account.name }),
    );

    expect(router.state.location.search).toEqual({ account: ACCOUNT_ID });
  });
});

describe("the overview screen", () => {
  it("leads with the total, then the returns", async () => {
    server.use(...signedIn());
    mount();

    expect(await screen.findByText("R$482,350.00")).toBeVisible();
    expect(screen.getByText("+12.4%")).toBeVisible();
    expect(screen.getByText("+6.8%")).toBeVisible();
    expect(screen.getByText("R$18,200.00")).toBeVisible();
  });

  it("offers an explainer beside each headline figure", async () => {
    server.use(...signedIn());
    mount();

    for (const entry of [
      explain.portfolio.total_value,
      explain.portfolio.nominal_return,
      explain.portfolio.real_return,
      explain.portfolio.free_cash,
    ]) {
      expect(
        await screen.findByRole("button", {
          name: `What is ${entry.label.toLocaleLowerCase()}?`,
        }),
      ).toBeInTheDocument();
    }
  });

  it("explains real return without claiming a twelve-month window", async () => {
    // The figure is deflated from the first holding to today, not over a
    // trailing year. Copy saying "the last 12 months" would describe a
    // calculation the server does not do.
    const user = userEvent.setup();
    server.use(...signedIn());
    mount();

    await user.click(
      await screen.findByRole("button", {
        name: `What is ${explain.portfolio.real_return.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.portfolio.real_return.body),
    ).toBeInTheDocument();
  });

  it("groups holdings under their account with its cash and subtotal", async () => {
    server.use(...signedIn());
    mount();

    await openAccountTab();
    const group = await screen.findByRole("region", { name: account.name });

    expect(within(group).getByText("R$291,400.00")).toBeVisible();
    expect(within(group).getByText("R$12,000.00")).toBeVisible();
  });

  it("explains net deposits, the column most often misread as a gain", async () => {
    const user = userEvent.setup();
    server.use(...signedIn());
    mount();

    await user.click(
      await screen.findByRole("button", {
        name: `What is ${explain.series.net_flow.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.series.net_flow.body),
    ).toBeInTheDocument();
  });

  it("explains the flow-adjusted monthly return", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByRole("button", {
        name: `What is ${explain.series.monthly_return.label.toLocaleLowerCase()}?`,
      }),
    ).toBeInTheDocument();
  });

  it("says the projection assumes no further deposits", async () => {
    const user = userEvent.setup();
    server.use(...signedIn());
    mount();

    await user.click(
      await screen.findByRole("button", {
        name: `What is ${explain.forecast.expected.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.forecast.expected.body),
    ).toBeInTheDocument();
  });

  it("does not list a position that has been sold down to nothing", async () => {
    server.use(...signedIn());
    mount();

    await openAccountTab();

    expect(await screen.findByText("PETR4")).toBeVisible();
    expect(screen.queryByText("VALE3")).not.toBeInTheDocument();
  });

  it("keeps the server's subtotal, which already counted the closed row as zero", async () => {
    server.use(...signedIn());
    mount();

    // Hiding a row that contributed nothing cannot change what it summed to.
    await openAccountTab();
    const group = await screen.findByRole("region", { name: account.name });

    expect(within(group).getByText("R$291,400.00")).toBeVisible();
  });

  it("treats a portfolio of only closed positions as a first run", async () => {
    server.use(...closedOnlyPortfolio());
    mount();

    expect(await screen.findByText(app.overview.firstRun.title)).toBeVisible();
  });

  it("qualifies the ranking rate with its lack of a minimum holding period", async () => {
    const user = userEvent.setup();
    server.use(...signedIn());
    mount();

    await user.click(
      await screen.findByRole("button", {
        name: `What is ${explain.ranking.monthly_profit_rate.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.ranking.monthly_profit_rate.body),
    ).toBeInTheDocument();
  });

  it("explains what a share is measured against", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByRole("button", {
        name: `What is ${explain.allocation.weight.label.toLocaleLowerCase()}?`,
      }),
    ).toBeInTheDocument();
  });

  it("makes each holding row the way into its detail", async () => {
    server.use(...signedIn());
    mount();

    await openAccountTab();
    const link = await screen.findByRole("link", { name: /PETR4/ });

    expect(link).toHaveAttribute(
      "href",
      `/app/holdings/${ACCOUNT_ID}/${PETR_ID}`,
    );
  });

  it("says a holding has no price instead of rendering a zero", async () => {
    server.use(...signedIn());
    mount();

    await openAccountTab();
    const row = await screen.findByRole("row", { name: /HASH11/ });

    expect(
      within(row).getByText(app.enums.missingReason.NO_QUOTE),
    ).toBeVisible();
    expect(within(row).queryByText("R$0.00")).not.toBeInTheDocument();
  });

  it("points at the profile when real return has no inflation reference", async () => {
    server.use(...signedIn({ ...overview, real_return: null }));
    mount();

    // The figure is absent because of a setting the user controls, so the
    // screen names the setting rather than showing an em dash.
    expect(
      await screen.findByRole("link", { name: app.overview.setInflation }),
    ).toHaveAttribute("href", PATHS.PROFILE);
  });

  it("sends the other two dimensions to the allocation screen", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByRole("link", { name: app.overview.seeAllocation }),
    ).toHaveAttribute("href", PATHS.ALLOCATION);
  });

  it("offers no way to write anything", async () => {
    server.use(...signedIn());
    mount();

    await screen.findByText("R$482,350.00");

    const main = screen.getByRole("main");
    for (const button of within(main).queryAllByRole("button")) {
      expect(button).not.toHaveAccessibleName(
        /new|add|edit|record|save|archive/i,
      );
    }
  });
});

describe("target status on the overview", () => {
  /** The same portfolio, with a verdict on its first holding. */
  const withStatus = (
    target_status: "AHEAD" | "ON_TRACK" | "BEHIND" | "BELOW_FLOOR" | null,
  ): PortfolioOverview => ({
    ...overview,
    accounts: [
      {
        ...overview.accounts[0],
        holdings: [
          { ...overview.accounts[0].holdings[0], target_status },
          overview.accounts[0].holdings[1],
        ],
      },
    ],
  });

  it("badges a holding a target resolved for", async () => {
    server.use(...signedIn(withStatus("BEHIND")));
    mount();

    await openAccountTab();

    expect(
      await screen.findByText(app.enums.targetStatus.BEHIND),
    ).toBeVisible();
  });

  it("leaves the cell empty when no target resolved, rather than saying so on every row", async () => {
    server.use(...signedIn(withStatus(null)));
    mount();

    await openAccountTab();
    await screen.findByText(app.overview.columns.status);

    for (const status of Object.values(app.enums.targetStatus)) {
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    }

    // And no stand-in either: an em dash would read as "measured, and nothing".
    const row = screen.getByRole("row", { name: /PETR4/ });
    expect(within(row).getAllByRole("cell").at(-1)).toBeEmptyDOMElement();
  });
});
