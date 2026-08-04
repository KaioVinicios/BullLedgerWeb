import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import {
  allocationQuery,
  getAllocation,
  getOverview,
  overviewQuery,
} from "@/services/portfolio";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

describe("getOverview", () => {
  it("reads the missing figures the rollup could not compute", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/overview/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            on_date: "2026-08-02",
            reporting_currency: "BRL",
            total_value: { amount: 120_000, currency: "BRL" },
            free_cash: { amount: 0, currency: "BRL" },
            complete: false,
            accounts: [],
            archetypes: [],
            nominal_return: null,
            real_return: null,
            missing: [
              {
                account: "11111111-1111-4111-8111-111111111111",
                asset: "22222222-2222-4222-8222-222222222222",
                reason: "NO_QUOTE",
              },
            ],
          },
        }),
      ),
    );

    const overview = await getOverview();

    // `missing` is the only place the API says which holdings could not be
    // valued and why — the whole reason Phase 7 reads this projection at all.
    expect(overview.complete).toBe(false);
    expect(overview.missing[0]?.reason).toBe("NO_QUOTE");
    expect(overview.on_date).toBe("2026-08-02");
  });

  it("keys under the projection root, so every write already invalidates it", () => {
    expect(overviewQuery().queryKey).toEqual([...PORTFOLIO_KEY, "overview"]);
  });
});

describe("getAllocation", () => {
  it("unwraps the envelope into the three dimensions", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/allocation/`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            on_date: "2026-08-03",
            reporting_currency: "BRL",
            total_value: { amount: 100_000, currency: "BRL" },
            complete: true,
            by_archetype: [
              {
                key: "EXCHANGE_SECURITY",
                value: { amount: 100_000, currency: "BRL" },
                weight: "1",
                complete: true,
              },
            ],
            by_currency: [],
            by_country: [],
            missing: [],
          },
        }),
      ),
    );

    const allocation = await getAllocation();

    expect(allocation.total_value.amount).toBe(100_000);
    expect(allocation.by_archetype[0]?.key).toBe("EXCHANGE_SECURITY");
    // A decimal string, never a float — the weight is rendered, not computed.
    expect(allocation.by_archetype[0]?.weight).toBe("1");
  });

  it("keys under the projection root beside the overview", () => {
    expect(allocationQuery().queryKey).toEqual([
      ...PORTFOLIO_KEY,
      "allocation",
    ]);
  });
});
