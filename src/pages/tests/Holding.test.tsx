import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { delay, http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { ContributionLimit } from "@/services/contributionLimits";
import type { HoldingDetail } from "@/services/portfolio";
import { targetKeys, type Target } from "@/services/targets";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });
const USD = (amount: number) => ({ amount, currency: "USD" as const });

const brAccount: Account = {
  id: ACCOUNT_ID,
  name: "Corretora XP",
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

const brAsset: Asset = {
  id: ASSET_ID,
  name: "PETR4",
  archetype: "EXCHANGE_SECURITY",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  ticker: "PETR4",
  exchange: "B3",
  security_type: "STOCK",
  pays_distributions: true,
};

const usdAsset: Asset = { ...brAsset, name: "AAPL", currency: "USD" };

const pair = (
  native: ReturnType<typeof BRL>,
  base: ReturnType<typeof BRL>,
) => ({
  native,
  base,
});

/** A BRL asset in a BRL account: one currency column. */
const singleCurrency: HoldingDetail = {
  account: ACCOUNT_ID,
  asset: ASSET_ID,
  archetype: "EXCHANGE_SECURITY",
  on_date: "2026-08-03",
  holding_start: "2025-02-10",
  holding_period_days: 539,
  registration: "BR_TAXABLE",
  tax_advantaged: false,
  reporting_currency: "BRL",
  quantity: "100",
  principal: null,
  current_value: pair(BRL(5_240_000), BRL(5_240_000)),
  cost_basis_remaining: pair(BRL(4_428_000), BRL(4_428_000)),
  invested: pair(BRL(4_461_000), BRL(4_461_000)),
  realized_gain: pair(BRL(120_000), BRL(120_000)),
  unrealized_gain: pair(BRL(812_000), BRL(812_000)),
  income_received: pair(BRL(48_800), BRL(48_800)),
  costs: pair(BRL(33_000), BRL(33_000)),
  total_return: "0.182",
  reporting: {
    value: BRL(5_240_000),
    invested: BRL(4_461_000),
    realized_gain: BRL(120_000),
    unrealized_gain: BRL(812_000),
    income_received: BRL(48_800),
  },
  real_return: "0.068",
  target: null,
  lots: [],
};

/** A USD asset in a BRL account: two currency columns. */
const crossCurrency: HoldingDetail = {
  ...singleCurrency,
  current_value: { native: USD(987_000), base: BRL(5_240_000) },
  cost_basis_remaining: { native: USD(834_000), base: BRL(4_428_000) },
  invested: { native: USD(840_200), base: BRL(4_461_000) },
  realized_gain: { native: USD(20_000), base: BRL(120_000) },
  unrealized_gain: { native: USD(153_000), base: BRL(812_000) },
  income_received: { native: USD(9_200), base: BRL(48_800) },
  costs: { native: USD(6_200), base: BRL(33_000) },
};

function signedIn(
  holding: HoldingDetail,
  account: Account = brAccount,
  asset: Asset = brAsset,
  limits: ContributionLimit[] = [],
  /**
   * The target the verdict resolved from. `TargetStatusResult.source` names it
   * but does not carry it, so the block reads it separately — which means
   * every holding carrying a verdict issues that request, and an unstubbed one
   * would be an unhandled request rather than a quiet no-op.
   *
   * Left out, the read 404s. That is deliberate: the tests that assert the
   * provenance line as an exact string are asserting it *alone*, and a stub
   * that answered would append the sentence and break them for a reason that
   * has nothing to do with what they cover.
   */
  target: Target | null = null,
) {
  return [
    ...(holding.target
      ? [
          http.get(
            `${TEST_API_URL}/api/targets/${holding.target.source.id}/`,
            () =>
              target
                ? HttpResponse.json({ status: 200, data: target })
                : HttpResponse.json(
                    { status: 404, message: "Not found.", errors: {} },
                    { status: 404 },
                  ),
          ),
        ]
      : []),
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(
      `${TEST_API_URL}/api/portfolio/holdings/${ACCOUNT_ID}/${ASSET_ID}/`,
      () => HttpResponse.json({ status: 200, data: holding }),
    ),
    http.get(`${TEST_API_URL}/api/accounts/${ACCOUNT_ID}/`, () =>
      HttpResponse.json({ status: 200, data: account }),
    ),
    http.get(`${TEST_API_URL}/api/assets/${ASSET_ID}/`, () =>
      HttpResponse.json({ status: 200, data: asset }),
    ),
    http.get(`${TEST_API_URL}/api/contribution-limits/`, () =>
      HttpResponse.json({
        status: 200,
        data: {
          count: limits.length,
          next: null,
          previous: null,
          results: limits,
        },
      }),
    ),
  ];
}

async function mount() {
  const { createAppRouter } = await import("@/routes/router");
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({
      initialEntries: [`/app/holdings/${ACCOUNT_ID}/${ASSET_ID}`],
    }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient };
}

describe("the holding detail screen", () => {
  it("leads with the reporting-currency figures", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    expect(await screen.findByText("R$52,400.00")).toBeVisible();
    // A gain carries its sign, never colour alone.
    expect(screen.getByText("+R$8,120.00")).toBeVisible();
  });

  it("names the holding and the account it sits in", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    expect(await screen.findByRole("heading", { name: "PETR4" })).toBeVisible();
    expect(screen.getByText(/Corretora XP/)).toBeVisible();
  });

  it("shows one currency column when the asset and account agree", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    const table = await screen.findByRole("table", {
      name: app.holding.figures.title,
    });

    // Label column plus one value column: a BRL user holding a BRL asset in a
    // BRL account must not read the same number twice.
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
  });

  it("shows both when they differ, and names which is which", async () => {
    server.use(...signedIn(crossCurrency, brAccount, usdAsset));
    await mount();

    const table = await screen.findByRole("table", {
      name: app.holding.figures.title,
    });

    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);

    // The caption names which currency is which, so a reader is never left to
    // infer that the left column is the asset's.
    expect(
      screen.getByText("Figures below in USD (asset) and BRL (account)."),
    ).toBeVisible();

    // Both currencies really render: the native figure and its base twin. In
    // en-US, USD is the local currency and formats bare — `$`, not `US$`.
    expect(within(table).getByText("$9,870.00")).toBeVisible();
    expect(within(table).getByText("R$52,400.00")).toBeVisible();
  });

  it("says a holding has no price instead of rendering a zero", async () => {
    server.use(
      ...signedIn({
        ...singleCurrency,
        current_value: null,
        unrealized_gain: null,
        reporting: {
          ...singleCurrency.reporting,
          value: null,
          unrealized_gain: null,
        },
      }),
    );
    await mount();

    // Absence is stated, never substituted: a zero would read as a real
    // balance of nothing.
    expect(
      (await screen.findAllByText(app.enums.missingReason.NO_QUOTE)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("R$0.00")).not.toBeInTheDocument();
  });

  it("links back to the movements that produced it", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    const link = await screen.findByRole("link", {
      name: app.holding.seeMovements,
    });

    expect(link).toHaveAttribute(
      "href",
      `/app/ledger?account=${ACCOUNT_ID}&asset=${ASSET_ID}`,
    );
  });

  it("sends lots to the screen that already renders them", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    // Not a second lots table. `/app/ledger/lots` reads this same projection
    // and renders every LotProjection figure already; duplicating it here
    // would be one more table to keep in step for no new fact.
    const link = await screen.findByRole("link", {
      name: app.holding.seeLots,
    });

    expect(link).toHaveAttribute(
      "href",
      `/app/ledger/lots?account=${ACCOUNT_ID}&asset=${ASSET_ID}`,
    );
  });

  it("states the holding period as a dated fact", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    expect(await screen.findByText(/539/)).toBeVisible();
  });

  it("offers no way to write anything", async () => {
    server.use(...signedIn(singleCurrency));
    await mount();

    await screen.findByText("R$52,400.00");

    for (const button of screen.queryAllByRole("button")) {
      expect(button).not.toHaveAccessibleName(
        /edit|record|save|delete|void|archive/i,
      );
    }
  });
});

describe("cost basis and tax context", () => {
  it("states weighted average for a Brazilian account", async () => {
    server.use(...signedIn(singleCurrency, brAccount));
    await mount();

    expect(
      await screen.findByText(app.enums.costBasisMethod.WEIGHTED_AVERAGE),
    ).toBeVisible();
  });

  it("states FIFO for a US account, so the divergence reads as intentional", async () => {
    server.use(
      ...signedIn(
        { ...singleCurrency, registration: "US_TAXABLE" },
        {
          ...brAccount,
          country: "US",
          registration: "US_TAXABLE",
          base_currency: "USD",
        },
        { ...brAsset, currency: "USD" },
      ),
    );
    await mount();

    // The same movements yield different realized gains in a US and a BR
    // account. That is correct, and the screen has to say why.
    expect(
      await screen.findByText(app.enums.costBasisMethod.FIFO),
    ).toBeVisible();
  });

  it("shows the year's limit beside the room, as information", async () => {
    const year = new Date().getFullYear();
    server.use(
      ...signedIn(
        { ...singleCurrency, registration: "CA_TFSA", tax_advantaged: true },
        {
          ...brAccount,
          country: "CA",
          registration: "CA_TFSA",
          base_currency: "CAD",
          contribution_room: { amount: 250_000, currency: "CAD" },
        },
        { ...brAsset, currency: "CAD" },
        [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            registration: "CA_TFSA",
            year,
            limit: { amount: 700_000, currency: "CAD" },
          },
        ],
      ),
    );
    await mount();

    expect(await screen.findByText("CA$2,500.00")).toBeVisible();
    // Its own query, so its own await: the room rides on the account, which
    // has already landed by the time the room renders.
    expect(await screen.findByText("CA$7,000.00")).toBeVisible();
    expect(screen.getByText(app.holding.tax.disclaimer)).toBeVisible();
  });

  it("never presents a figure as tax owed", async () => {
    server.use(
      ...signedIn(
        { ...singleCurrency, registration: "CA_TFSA", tax_advantaged: true },
        { ...brAccount, country: "CA", registration: "CA_TFSA" },
      ),
    );
    await mount();

    await screen.findByText(app.holding.tax.title);

    // A v1 boundary, not a preference: the API never computes tax owed, and
    // no screen may imply it does.
    expect(
      screen.queryByText(/tax (owed|due|payable)/i),
    ).not.toBeInTheDocument();
  });

  it("renders without the limit rather than with a wrong one", async () => {
    server.use(
      ...signedIn(
        { ...singleCurrency, registration: "CA_TFSA", tax_advantaged: true },
        {
          ...brAccount,
          country: "CA",
          registration: "CA_TFSA",
          base_currency: "CAD",
          contribution_room: { amount: 250_000, currency: "CAD" },
        },
        { ...brAsset, currency: "CAD" },
        // Page 1 carries no row for this registration and year. A limit for
        // the wrong year is worse than no limit at all.
        [],
      ),
    );
    await mount();

    expect(await screen.findByText(app.holding.tax.title)).toBeVisible();
    expect(await screen.findByText("CA$2,500.00")).toBeVisible();
    expect(screen.queryByText("CA$7,000.00")).not.toBeInTheDocument();
  });
});

describe("the holding's target block", () => {
  const TARGET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const withTarget = (target: HoldingDetail["target"]): HoldingDetail => ({
    ...singleCurrency,
    target,
  });

  const onTrack: HoldingDetail["target"] = {
    status: "ON_TRACK",
    actual: "0.041",
    expected: "0.03",
    band: "0.005",
    source: { scope: "HOLDING", id: TARGET_ID },
  };

  /** The target `onTrack.source` names, as the API would answer for it. */
  const resolved: Target = {
    id: TARGET_ID,
    scope: "HOLDING",
    account: ACCOUNT_ID,
    asset: ASSET_ID,
    loss_limit_pct: null,
    loss_limit_period: null,
    steps: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        from_month: 0,
        rate: "0.03",
        rate_period: "MONTHLY",
      },
    ],
    archived_at: null,
  };

  it("renders the verdict with its label and the three figures", async () => {
    server.use(
      ...signedIn(
        withTarget({
          status: "AHEAD",
          actual: "0.182",
          expected: "0.12",
          band: "0.02",
          source: {
            scope: "HOLDING",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        }),
      ),
    );
    await mount();

    expect(await screen.findByText(app.enums.targetStatus.AHEAD)).toBeVisible();
    expect(screen.getByText("18.2%")).toBeVisible();
    expect(screen.getByText("12%")).toBeVisible();
    expect(screen.getByText("2%")).toBeVisible();
  });

  it("names the level the verdict resolved from", async () => {
    server.use(
      ...signedIn(
        withTarget({
          status: "BEHIND",
          actual: "0.05",
          expected: "0.12",
          band: "0.02",
          source: {
            scope: "ACCOUNT_ARCHETYPE",
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          },
        }),
      ),
    );
    await mount();

    expect(
      await screen.findByText(
        app.holding.target.from.ACCOUNT_ARCHETYPE.replace(
          "{{archetype}}",
          app.enums.archetype.EXCHANGE_SECURITY,
        ).replace("{{account}}", "Corretora XP"),
      ),
    ).toBeVisible();
  });

  it("states the provenance without offering a link to the target it names", async () => {
    server.use(
      ...signedIn(
        withTarget({
          status: "ON_TRACK",
          actual: "0.12",
          expected: "0.12",
          band: "0.02",
          source: {
            scope: "HOLDING",
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        }),
      ),
    );
    await mount();

    await screen.findByText(app.enums.targetStatus.ON_TRACK);

    // This screen reads. It does not grow an edit path to what it is reading.
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(
        /\/app\/targets\/[^/]+\/edit/,
      );
    }
  });

  it("says what the verdict is measured against once the target arrives", async () => {
    server.use(
      ...signedIn(withTarget(onTrack), brAccount, brAsset, [], resolved),
    );
    await mount();

    const block = await screen.findByRole("region", {
      name: app.holding.target.title,
    });

    // One exact string carrying both halves: the sentence is an addition to
    // the provenance line, never a replacement for it. `within` the block
    // because the figures above it are the kind of adjacent content a loose
    // match would settle for.
    expect(
      await within(block).findByText(
        `${app.holding.target.from.HOLDING} 3% monthly from the first purchase`,
      ),
    ).toBeVisible();
  });

  it("keeps the provenance line alone while the target is still loading", async () => {
    server.use(
      // Never answers. The pending state is the subject here, and a handler
      // that resolved would race the assertions below against its own fetch.
      http.get(`${TEST_API_URL}/api/targets/${TARGET_ID}/`, () =>
        delay("infinite"),
      ),
      ...signedIn(withTarget(onTrack)),
    );
    await mount();

    const block = await screen.findByRole("region", {
      name: app.holding.target.title,
    });

    // The verdict first: it proves the block finished rendering, so the exact
    // match below is a statement about the copy rather than about an empty
    // section that never painted its second half.
    expect(
      within(block).getByText(app.enums.targetStatus.ON_TRACK),
    ).toBeVisible();
    // Exact, and load-bearing: an appended sentence would not match this.
    expect(
      within(block).getByText(app.holding.target.from.HOLDING),
    ).toBeVisible();
  });

  it("falls back to the provenance line when the target cannot be read", async () => {
    let reads = 0;

    server.use(
      // A 500, and a well-formed error body so it normalizes to `kind:
      // "server"` — the one kind `createQueryClient`'s default policy retries.
      // That is what makes the block's own `retry: false` observable: with the
      // guard deleted this endpoint is read three times, and `reads` below
      // fails. A 400 would never retry, and would prove nothing.
      http.get(`${TEST_API_URL}/api/targets/${TARGET_ID}/`, () => {
        reads += 1;

        return HttpResponse.json(
          {
            status: 500,
            message: "Server error.",
            errors: { detail: ["boom"] },
          },
          { status: 500 },
        );
      }),
      ...signedIn(withTarget(onTrack)),
    );
    const { queryClient } = await mount();

    // The read really failed, rather than merely not having arrived yet —
    // which is what an assertion made a tick too early would have measured.
    await waitFor(() =>
      expect(
        queryClient.getQueryState(targetKeys.detail(TARGET_ID))?.status,
      ).toBe("error"),
    );

    const block = screen.getByRole("region", {
      name: app.holding.target.title,
    });

    expect(
      within(block).getByText(app.holding.target.from.HOLDING),
    ).toBeVisible();
    expect(within(block).queryByText(/from the first purchase/)).toBeNull();
    expect(reads).toBe(1);
  });

  it("treats no target as no status, not as a failure", async () => {
    server.use(...signedIn(withTarget(null)));
    await mount();

    expect(await screen.findByText(app.holding.target.none)).toBeVisible();

    // No verdict word, no warning tone, no zero standing in for a figure.
    for (const status of Object.values(app.enums.targetStatus)) {
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    }
  });

  it("prefills the scope on the way to the form", async () => {
    server.use(...signedIn(withTarget(null)));
    await mount();

    const href = (
      await screen.findByRole("link", { name: app.holding.target.set })
    ).getAttribute("href");

    expect(href).toContain("/app/targets/new");
    expect(href).toContain("scope=HOLDING");
    expect(href).toContain(`account=${ACCOUNT_ID}`);
    expect(href).toContain(`asset=${ASSET_ID}`);
  });
});
