import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { listSales, salesQuery, type SaleRow } from "@/services/sales";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

// A live-captured row (Task 5's verification against the real API): a
// partial equity sell with one exit, profit_rate rendered as a decimal
// fraction (recomputed from the row's own proceeds/cost after Task 8b
// dropped the endpoint's ×100 and renamed the field).
const saleRow: SaleRow = {
  lot: { id: "b722438a-1577-4e56-8e96-484091aeb2ba", label: "Lot — 2025-03-12" },
  account: { id: "8d3cc69f-d2c9-4981-9819-ccadbe93b0d0", name: "XP Corretora" },
  asset: {
    id: "669049fb-9333-4c4d-bbde-959e9202700e",
    name: "Petrobras PN",
    archetype: "EXCHANGE_SECURITY",
    currency: "BRL",
  },
  purchased_on: "2025-03-12",
  entry_quantity: "10",
  entry_unit_price: "36.2",
  cost: {
    native: { amount: 36200, currency: "BRL" },
    base: { amount: 36200, currency: "BRL" },
  },
  sold_on: "2026-03-22",
  quantity_sold: "5",
  proceeds: {
    native: { amount: 20800, currency: "BRL" },
    base: { amount: 20800, currency: "BRL" },
  },
  cost_removed: {
    native: { amount: 18100, currency: "BRL" },
    base: { amount: 18100, currency: "BRL" },
  },
  profit: {
    native: { amount: 2700, currency: "BRL" },
    base: { amount: 2700, currency: "BRL" },
  },
  profit_rate: "0.14917127",
  fully_sold: false,
  sales: [
    {
      movement: "9488b734-a60e-449f-a36d-6cdfe3b83c50",
      kind: "SELL",
      sold_on: "2026-03-22",
      quantity: "5",
      proceeds: {
        native: { amount: 20800, currency: "BRL" },
        base: { amount: 20800, currency: "BRL" },
      },
      cost_removed: {
        native: { amount: 18100, currency: "BRL" },
        base: { amount: 18100, currency: "BRL" },
      },
      profit: {
        native: { amount: 2700, currency: "BRL" },
        base: { amount: 2700, currency: "BRL" },
      },
      profit_rate: "0.14917127",
    },
  ],
};

describe("listSales", () => {
  it("sends every filter as a query param and returns the rows verbatim", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/sales/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [saleRow] },
        });
      }),
    );

    const page = await listSales({
      account: saleRow.account.id,
      result: "PROFIT",
      ordering: "-sold_on",
    });

    expect(url?.searchParams.get("account")).toBe(saleRow.account.id);
    expect(url?.searchParams.get("result")).toBe("PROFIT");
    expect(url?.searchParams.get("ordering")).toBe("-sold_on");
    // profit_rate is a decimal string end to end — never coerced to a float.
    expect(page.results[0]?.profit_rate).toBe("0.14917127");
    expect(page.results[0]?.sales).toHaveLength(1);
  });

  it("carries a lot's null purchase fields for a principal-based disposal", async () => {
    // Fixed-income lots have no unit quantity, so `entry_quantity` and
    // `entry_unit_price` arrive null rather than being coerced to "0".
    const maturityRow: SaleRow = {
      ...saleRow,
      entry_quantity: null,
      entry_unit_price: null,
      quantity_sold: null,
      fully_sold: true,
      sales: [{ ...saleRow.sales[0]!, movement: null, kind: "MATURITY" }],
    };

    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/sales/`, () =>
        HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [maturityRow] },
        }),
      ),
    );

    const page = await listSales({});

    expect(page.results[0]?.entry_quantity).toBeNull();
    expect(page.results[0]?.sales[0]?.movement).toBeNull();
    expect(page.results[0]?.sales[0]?.kind).toBe("MATURITY");
  });
});

describe("salesQuery", () => {
  it("keys under the portfolio root, so any ledger write invalidates it", () => {
    const query = { ordering: "-sold_on" } as const;

    expect(salesQuery(query).queryKey).toEqual([
      ...PORTFOLIO_KEY,
      "sales",
      "list",
      query,
    ]);
  });
});
