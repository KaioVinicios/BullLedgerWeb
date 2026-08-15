import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import {
  historyFixture,
  performanceFixture,
  forecastFixture,
} from "@/mocks/fixtures/insights";
import {
  forecastQuery,
  historyQuery,
  performanceQuery,
} from "@/services/portfolio";

describe("insights reads", () => {
  it("unwraps the history envelope", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/history/`, () =>
        HttpResponse.json({ status: 200, data: historyFixture }),
      ),
    );

    const data = await historyQuery().queryFn!({} as never);

    expect(data.points.length).toBe(historyFixture.points.length);
  });

  it("sends the account scope when one is given", async () => {
    let seen: string | null = null;
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/performance/`, ({ request }) => {
        seen = new URL(request.url).searchParams.get("account");
        return HttpResponse.json({ status: 200, data: performanceFixture });
      }),
    );

    await performanceQuery("11111111-1111-4111-8111-111111111111").queryFn!(
      {} as never,
    );

    expect(seen).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("omits the account parameter for the portfolio scope", async () => {
    let seen: string | null = "unset";
    server.use(
      http.get(`${TEST_API_URL}/api/portfolio/forecast/`, ({ request }) => {
        seen = new URL(request.url).searchParams.get("account");
        return HttpResponse.json({ status: 200, data: forecastFixture });
      }),
    );

    await forecastQuery().queryFn!({} as never);

    expect(seen).toBeNull();
  });

  it("keys each scope separately so tabs do not evict each other", () => {
    expect(historyQuery("abc").queryKey).not.toEqual(historyQuery().queryKey);
  });
});
