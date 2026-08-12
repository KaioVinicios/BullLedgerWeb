import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { listAllAssets, type Asset } from "@/services/assets";

const asset = (id: string): Asset => ({
  id,
  name: id,
  archetype: "CRYPTO",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: id,
  decimals: 8,
  price_currency: "USD",
  chain: "",
});

describe("listAllAssets", () => {
  it("walks every page rather than stopping at the first", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/assets/`, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        const last = page === "2";

        return HttpResponse.json({
          status: 200,
          data: {
            count: 2,
            next: last ? null : `${TEST_API_URL}/api/assets/?page=2`,
            previous: null,
            results: [asset(last ? "second" : "first")],
          },
        });
      }),
    );

    const rows = await listAllAssets();

    expect(rows.map((row) => row.id)).toEqual(["first", "second"]);
  });

  // A target can name an archived asset, and a lookup table that cannot
  // resolve it would print a UUID on the card.
  it("includes archived rows, because it is a lookup table", async () => {
    let asked: string | null = null;

    server.use(
      http.get(`${TEST_API_URL}/api/assets/`, ({ request }) => {
        asked = new URL(request.url).searchParams.get("include_archived");

        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAllAssets();

    expect(asked).toBe("true");
  });
});
