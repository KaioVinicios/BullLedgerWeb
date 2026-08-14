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

/**
 * A second holding-level target, so a list of them has a length to announce
 * and the first level of the explainer has a count worth reading. Its asset is
 * deliberately one the asset list does not carry, which keeps its name
 * distinct from `existing`'s.
 */
const alsoHolding: Target = {
  ...existing,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  asset: "55555555-5555-4555-8555-555555555555",
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

/**
 * The list walks `/api/targets/` once per level, so the handler answers by
 * `scope`: rows only for the level they belong to. One page each — a walk that
 * has to follow `next` is set up by the pagination test alone.
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

    // The whole `<h2>` outline, not a filtered subset: it *is* the resolution
    // rule, so the explainer heading it and the levels following in order are
    // one assertion about one structure. A card's name is deliberately not in
    // here — see `ScopeSection` on why the records stay out of the outline.
    expect(headings.map((node) => node.textContent)).toEqual([
      app.targets.resolution.title,
      app.enums.targetScope.HOLDING,
      app.enums.targetScope.ACCOUNT_ARCHETYPE,
      app.enums.targetScope.PORTFOLIO_ARCHETYPE,
    ]);
  });

  it("states the resolution rule, because the sections alone only imply it", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    expect(await screen.findByText(app.targets.resolution.rule)).toBeVisible();
  });

  it("names a target by its scope, since a target has no name of its own", async () => {
    server.use(...signedIn([existing]));
    mount(PATHS.TARGETS);

    expect(await screen.findByText("BTC · Binance")).toBeVisible();
  });

  // The old assertion guarded a table cell that showed the first rung and
  // "+2 more". There is no cell now and no remainder to hide: the card reads
  // the whole ladder, which is what that test was protecting the spirit of.
  it("reads the whole ladder on the card, with no hidden remainder", async () => {
    const laddered: Target = {
      ...existing,
      steps: [
        {
          ...existing.steps[0],
          from_month: 0,
          rate: "0.03",
          rate_period: "MONTHLY",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          from_month: 3,
          rate: "0.02",
          rate_period: "MONTHLY",
        },
      ],
    };

    server.use(...signedIn([laddered]));
    mount(PATHS.TARGETS);

    const line = await screen.findByText(/3% monthly/);

    expect(line).toHaveTextContent("2% monthly from month 3 onwards");
    expect(line.textContent).not.toMatch(/\+\d+ more/);
  });

  it("lists a level's cards, so how many there are is announced", async () => {
    server.use(...signedIn([existing, alsoHolding]));
    mount(PATHS.TARGETS);

    // The section exists before its rows do, so wait on a row rather than on
    // the region — a skeleton would otherwise answer the list query.
    await screen.findByText("BTC · Binance");

    // Scoped to the level: the explainer is a list on this page too, and an
    // unscoped list query would be ambiguous between them.
    const section = screen.getByRole("region", {
      name: app.enums.targetScope.HOLDING,
    });
    const items = within(within(section).getByRole("list")).getAllByRole(
      "listitem",
    );

    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("BTC · Binance")).toBeVisible();
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

    // This handler has to come first: `server.use` prepends, and the first
    // match wins — `signedIn`'s own targets handler would otherwise answer.
    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        const url = new URL(request.url);
        const scope = url.searchParams.get("scope");
        const pageNumber = Number(url.searchParams.get("page") ?? "1");

        // Only the holding level has a second page; the other two are empty,
        // or they would each grow a pagination control of their own.
        if (scope !== "HOLDING") return HttpResponse.json(page([]));

        // The walk pulls both pages; the screen then cuts them locally.
        return HttpResponse.json({
          status: 200,
          data: {
            count: 60,
            next:
              pageNumber === 1 ? `${TEST_API_URL}/api/targets/?page=2` : null,
            previous: null,
            results: pageNumber === 1 ? many.slice(0, 50) : many.slice(50),
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

  // The other half of the contract, and the half that was unpinned: the test
  // above proves clicking "next" *writes* `holdingPage`, not that arriving with
  // it written *reads* the right rows. Trading server pagination for a local
  // slice was justified on the bookmark surviving, so the read direction is the
  // proof — swapping two entries in `PAGE_PARAM` breaks it and nothing else in
  // the suite would notice.
  it("opens a bookmarked page on the rows that page holds", async () => {
    // Distinct assets, so each card has a distinguishable name: the asset list
    // carries only BTC, and `names` falls back to the id it was asked about.
    const asset = (index: number) =>
      `55555555-5555-4555-8555-${String(index).padStart(12, "0")}`;
    const many = Array.from({ length: 60 }, (_, index) => ({
      ...existing,
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`,
      asset: asset(index),
    }));

    server.use(...signedIn(many));
    mount(`${PATHS.TARGETS}?holdingPage=2`);

    // The 51st row — the first one page 2 holds at `PAGE_SIZE` 50.
    expect(await screen.findByText(`${asset(50)} · Binance`)).toBeVisible();
    // And page 1's rows are not also on screen, which a slice that ignored the
    // parameter would leave them.
    expect(screen.queryByText(`${asset(0)} · Binance`)).toBeNull();

    const section = screen.getByRole("region", {
      name: app.enums.targetScope.HOLDING,
    });

    expect(
      within(within(section).getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(10);
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

  it("counts each level in the explainer", async () => {
    // Two rows at the first level on purpose. Each row of the explainer shows
    // its ordinal beside its count, so a level holding exactly as many targets
    // as its position would let the assertion pass on the ordinal alone —
    // level 1 shows "2" here, and level 3 shows "0" against an ordinal of 3.
    server.use(...signedIn([existing, alsoHolding]));
    mount(PATHS.TARGETS);

    // The counts read "—" until every level has landed, so wait on a row.
    await screen.findByText("BTC · Binance");

    const explainer = screen.getByRole("region", {
      name: app.targets.resolution.title,
    });
    const items = within(explainer).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("2");
    expect(items[2]).toHaveTextContent("0");
  });

  it("counts no level whose load failed, rather than reporting it empty", async () => {
    server.use(
      // Override first — MSW resolves with the first handler that matches, and
      // `signedIn()` already serves this path.
      //
      // A 400 rather than a 500, the same trade `Pricing.test.tsx` makes:
      // `queryClient` retries `server` and `network` failures twice with
      // backoff, which is right and slower than this assertion should wait.
      // What is under test is what the explainer says when no answer arrived,
      // and that does not depend on which failure stopped it.
      http.get(`${TEST_API_URL}/api/targets/`, () =>
        HttpResponse.json({ status: 400, detail: "boom" }, { status: 400 }),
      ),
      ...signedIn([existing]),
    );
    mount(PATHS.TARGETS);

    // The gate: `ListError` renders only once a query has actually failed, so
    // reaching it proves the load settled rather than that it is still in
    // flight. A failed query is not pending and carries no data, which is
    // exactly the state that used to read as a confident zero.
    await screen.findByRole("alert");

    const explainer = screen.getByRole("region", {
      name: app.targets.resolution.title,
    });

    for (const item of within(explainer).getAllByRole("listitem")) {
      expect(item).toHaveTextContent(app.targets.resolution.unknown);
      expect(item).not.toHaveTextContent(app.targets.resolution.count_zero);
    }
  });

  it("notes when a more specific target covers part of a broader one", async () => {
    const portfolio: Target = {
      id: "pppppppp-pppp-4ppp-8ppp-pppppppppppp",
      scope: "PORTFOLIO_ARCHETYPE",
      archetype: "CRYPTO",
      loss_limit_pct: null,
      loss_limit_period: null,
      steps: existing.steps,
      archived_at: null,
    };

    server.use(...signedIn([existing, portfolio]));
    mount(PATHS.TARGETS);

    expect(
      await screen.findByText(
        app.targets.shadowed_one.replace("{{names}}", "BTC · Binance"),
      ),
    ).toBeVisible();
  });
});
