/**
 * The traffic the overview screen makes, in one place.
 *
 * The screen reads six endpoints now — the rollup, accounts, assets, and the
 * three analytics reads behind its blocks — and four suites mount it. Declared
 * per file, the set would drift, and a suite that forgot one would fail on
 * `onUnhandledRequest: "error"` with a message about MSW rather than about the
 * block under test.
 *
 * The insights responses are the captured fixtures, never invented ones: see
 * the header of `src/mocks/fixtures/insights.ts` for the defect that rule
 * exists because of. A suite that needs a *particular* shape overrides one
 * endpoint by appending its own handler after these.
 */
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import {
  allocationFixture,
  forecastFixture,
  historyFixture,
  performanceFixture,
} from "@/mocks/fixtures/insights";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { PortfolioOverview } from "@/services/portfolio";

export const user = {
  pk: 1,
  email: "ana@example.com",
  first_name: "",
  last_name: "",
};

export const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
export const PETR_ID = "22222222-2222-4222-8222-222222222222";
export const HASH_ID = "33333333-3333-4333-8333-333333333333";
export const VALE_ID = "44444444-4444-4444-8444-444444444444";

export const BRL = (amount: number) => ({ amount, currency: "BRL" as const });

export const account: Account = {
  id: ACCOUNT_ID,
  name: "Corretora XP",
  institution: null,
  institution_name: "",
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

export const petr: Asset = {
  id: PETR_ID,
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

export const hash: Asset = {
  ...petr,
  id: HASH_ID,
  name: "HASH11",
  ticker: "HASH11",
};

export const vale: Asset = {
  ...petr,
  id: VALE_ID,
  name: "VALE3",
  ticker: "VALE3",
};

/** Bought and sold in full: a row the rollup still reports, at zero. */
export const closedHolding = {
  account: ACCOUNT_ID,
  asset: VALE_ID,
  archetype: "EXCHANGE_SECURITY" as const,
  quantity: "0",
  cost_basis_remaining_native: BRL(0),
  current_value_native: BRL(0),
  value: BRL(0),
  invested: BRL(5_000_000),
  realized_gain: BRL(1_200_000),
  unrealized_gain: BRL(0),
  income_received: BRL(0),
  total_return: "0.24",
  complete: true,
  target_status: null,
};

export const overview: PortfolioOverview = {
  on_date: "2026-08-03",
  reporting_currency: "BRL",
  total_value: BRL(48_235_000),
  free_cash: BRL(1_820_000),
  complete: false,
  accounts: [
    {
      account: ACCOUNT_ID,
      cash: BRL(1_200_000),
      subtotal: BRL(29_140_000),
      complete: false,
      nominal_return: null,
      real_return: null,
      holdings: [
        {
          account: ACCOUNT_ID,
          asset: PETR_ID,
          archetype: "EXCHANGE_SECURITY",
          quantity: "100",
          cost_basis_remaining_native: BRL(19_780_000),
          current_value_native: BRL(21_410_000),
          value: BRL(21_410_000),
          invested: BRL(19_780_000),
          realized_gain: BRL(0),
          unrealized_gain: BRL(1_630_000),
          income_received: BRL(48_800),
          total_return: "0.082",
          complete: true,
          target_status: null,
        },
        {
          account: ACCOUNT_ID,
          asset: HASH_ID,
          archetype: "EXCHANGE_SECURITY",
          quantity: "50",
          cost_basis_remaining_native: BRL(5_000_000),
          current_value_native: null,
          value: null,
          invested: BRL(5_000_000),
          realized_gain: BRL(0),
          unrealized_gain: null,
          income_received: BRL(0),
          total_return: null,
          complete: false,
          target_status: null,
        },
        closedHolding,
      ],
    },
  ],
  archetypes: [
    {
      archetype: "EXCHANGE_SECURITY",
      value: BRL(21_410_000),
      weight: "1",
      complete: false,
    },
  ],
  nominal_return: "0.124",
  real_return: "0.068",
  missing: [{ account: ACCOUNT_ID, asset: HASH_ID, reason: "NO_QUOTE" }],
};

export function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

/**
 * The captured responses, trimmed to the rows a test actually reads.
 *
 * Every value here still comes from the server — these are slices of the
 * captures, never edits of them — which is the property the fixtures exist
 * for. What is dropped is length: the real history is 18 months and the real
 * forecast 12, and the overview screen renders every one of them into a table
 * on each of the ~40 mounts across these suites. Three and two prove the same
 * things for a fraction of the DOM.
 *
 * **The free-cash row is kept deliberately.** It is the null-`asset` slice
 * whose mislabelling is the whole reason these fixtures are captured rather
 * than written, so it survives the trim while ordinary asset rows do not. A
 * suite needing the full capture imports it and overrides the handler.
 */
export const leanHistory: typeof historyFixture = {
  ...historyFixture,
  points: historyFixture.points.slice(0, 3),
};

export const leanForecast: typeof forecastFixture = {
  ...forecastFixture,
  points: forecastFixture.points.slice(0, 2),
};

export const leanAllocation: typeof allocationFixture = {
  ...allocationFixture,
  by_asset: [
    ...allocationFixture.by_asset
      .filter((slice) => slice.asset !== null)
      .slice(0, 2),
    ...allocationFixture.by_asset.filter((slice) => slice.asset === null),
  ],
};

/** The three analytics reads, on their captured responses. */
export function insightsHandlers() {
  return [
    http.get(`${TEST_API_URL}/api/portfolio/history/`, () =>
      HttpResponse.json({ status: 200, data: leanHistory }),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/performance/`, () =>
      HttpResponse.json({ status: 200, data: performanceFixture }),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/forecast/`, () =>
      HttpResponse.json({ status: 200, data: leanForecast }),
    ),
    http.get(`${TEST_API_URL}/api/portfolio/allocation/`, () =>
      HttpResponse.json({ status: 200, data: leanAllocation }),
    ),
  ];
}

/** Everything a signed-in overview reads, on the default portfolio. */
export function overviewHandlers(data: PortfolioOverview = overview) {
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
