import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { listLots, type Lot } from "@/services/lots";

const lot: Lot = {
  id: "33333333-3333-4333-8333-333333333333",
  account: "11111111-1111-4111-8111-111111111111",
  asset: "22222222-2222-4222-8222-222222222222",
  label: "Lot — 2026-03-04",
  archived_at: null,
};

describe("listLots", () => {
  it("scopes the list to one holding", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/lots/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [lot] },
        });
      }),
    );

    const page = await listLots({ account: lot.account, asset: lot.asset });

    expect(url?.searchParams.get("account")).toBe(lot.account);
    expect(url?.searchParams.get("asset")).toBe(lot.asset);
    expect(page.results[0]?.label).toBe("Lot — 2026-03-04");
  });
});
