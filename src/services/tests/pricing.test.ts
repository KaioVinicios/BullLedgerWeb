import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import {
  createPriceQuote,
  invalidatePricing,
  listFxRates,
  listPriceQuotes,
  priceQuoteKeys,
  type FxRate,
  type PriceQuote,
} from "@/services/pricing";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

const ASSET = "22222222-2222-4222-8222-222222222222";

const quote: PriceQuote = {
  id: "55555555-5555-4555-8555-555555555555",
  asset: ASSET,
  date: "2026-08-02",
  price: "34.10",
  price_source: "MANUAL",
};

const rate: FxRate = {
  id: "66666666-6666-4666-8666-666666666666",
  base: "BRL",
  quote: "USD",
  date: "2026-08-02",
  rate: "0.18420",
  source: "FEED",
};

function page<T>(results: T[]) {
  return {
    status: 200,
    data: { count: results.length, next: null, previous: null, results },
  };
}

describe("listPriceQuotes", () => {
  it("sends the asset filter and unwraps the envelope", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/price-quotes/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(page([quote]));
      }),
    );

    const result = await listPriceQuotes({ asset: ASSET, page: 2 });

    expect(url?.searchParams.get("asset")).toBe(ASSET);
    expect(url?.searchParams.get("page")).toBe("2");
    // The caller receives `data` directly — never the envelope.
    expect(result.results[0]?.price).toBe("34.10");
  });
});

describe("createPriceQuote", () => {
  it("posts the decimal string verbatim", async () => {
    let body: unknown;

    server.use(
      http.post(`${TEST_API_URL}/api/price-quotes/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 201, data: quote }, { status: 201 });
      }),
    );

    const created = await createPriceQuote({
      asset: ASSET,
      date: "2026-08-02",
      price: "34.10",
    });

    // A price is a decimal string end to end: no rounding, no float, no
    // reformatting between the form and the wire.
    expect(body).toEqual({ asset: ASSET, date: "2026-08-02", price: "34.10" });
    expect(created.price_source).toBe("MANUAL");
  });
});

describe("listFxRates", () => {
  it("sends both currency filters", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/fx-rates/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(page([rate]));
      }),
    );

    const result = await listFxRates({ base: "BRL", quote: "USD" });

    expect(url?.searchParams.get("base")).toBe("BRL");
    expect(url?.searchParams.get("quote")).toBe("USD");
    expect(result.results[0]?.source).toBe("FEED");
  });
});

describe("invalidatePricing", () => {
  it("drops the quote lists and every projection", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(priceQuoteKeys.list({ asset: ASSET }), page([]));
    queryClient.setQueryData([...PORTFOLIO_KEY, "overview"], { total: 1 });

    await invalidatePricing(queryClient);

    // Asserted by reading cache state rather than by spying on the call: what
    // matters is that the entries are stale, not that a method ran.
    expect(
      queryClient.getQueryState(priceQuoteKeys.list({ asset: ASSET }))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState([...PORTFOLIO_KEY, "overview"])?.isInvalidated,
    ).toBe(true);
  });
});
