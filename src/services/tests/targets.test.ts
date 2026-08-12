import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient } from "@tanstack/react-query";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PORTFOLIO_KEY } from "@/services/queryKeys";
import {
  invalidateTargets,
  listAllTargetsInScope,
  targetKeys,
  type Target,
} from "@/services/targets";

function holdingTarget(suffix: string): Target {
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa${suffix}`,
    scope: "HOLDING",
    account: "11111111-1111-4111-8111-111111111111",
    asset: `22222222-2222-4222-8222-2222222222${suffix}`,
    loss_limit_pct: null,
    loss_limit_period: null,
    steps: [
      {
        id: `33333333-3333-4333-8333-3333333333${suffix}`,
        from_month: 0,
        rate: "0.12",
        rate_period: "ANNUAL",
      },
    ],
    archived_at: null,
  };
}

describe("listAllTargetsInScope", () => {
  it("walks every page rather than trusting the first", async () => {
    const seen: Array<string | null> = [];

    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get("page"));

        const page = Number(url.searchParams.get("page") ?? "1");
        const last = page === 3;

        return HttpResponse.json({
          status: 200,
          data: {
            count: 3,
            next: last ? null : `${TEST_API_URL}/api/targets/?page=${page + 1}`,
            previous: null,
            results: [holdingTarget(`0${page}`)],
          },
        });
      }),
    );

    const rows = await listAllTargetsInScope("HOLDING");

    expect(rows).toHaveLength(3);
    expect(seen).toEqual(["1", "2", "3"]);
  });

  it("sends the scope filter, so the walk is one level and not the whole table", async () => {
    let scope: string | null = null;

    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        scope = new URL(request.url).searchParams.get("scope");

        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAllTargetsInScope("ACCOUNT_ARCHETYPE");

    expect(scope).toBe("ACCOUNT_ARCHETYPE");
  });

  it("never asks for archived rows: the server's rule is among non-archived ones", async () => {
    let includeArchived: string | null = "unset";

    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        includeArchived = new URL(request.url).searchParams.get(
          "include_archived",
        );

        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAllTargetsInScope("HOLDING");

    expect(includeArchived).toBeNull();
  });

  it("asks for archived rows only when told to", async () => {
    const seen: (string | null)[] = [];

    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("include_archived"));

        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAllTargetsInScope("HOLDING");
    await listAllTargetsInScope("HOLDING", true);

    expect(seen).toEqual([null, "true"]);
  });
});

describe("invalidateTargets", () => {
  it("sweeps the resource and the projections, because a target changes a verdict", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(targetKeys.list({}), { count: 0, results: [] });
    queryClient.setQueryData([...PORTFOLIO_KEY, "overview"], { total: 1 });

    await invalidateTargets(queryClient);

    expect(queryClient.getQueryState(targetKeys.list({}))?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState([...PORTFOLIO_KEY, "overview"])?.isInvalidated,
    ).toBe(true);
  });
});
