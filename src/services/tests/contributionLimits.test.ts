import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import {
  contributionLimitKeys,
  findLimit,
  listContributionLimits,
  type ContributionLimit,
} from "@/services/contributionLimits";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

const rows: ContributionLimit[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    registration: "CA_TFSA",
    year: 2026,
    limit: { amount: 700_000, currency: "CAD" },
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    registration: "CA_TFSA",
    year: 2025,
    limit: { amount: 700_000, currency: "CAD" },
  },
];

describe("listContributionLimits", () => {
  it("unwraps the paginated envelope", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/contribution-limits/`, () =>
        HttpResponse.json({
          status: 200,
          data: { count: 2, next: null, previous: null, results: rows },
        }),
      ),
    );

    const page = await listContributionLimits({ page: 1 });

    expect(page.count).toBe(2);
    expect(page.results[0]?.registration).toBe("CA_TFSA");
    // Money stays integer minor units all the way through.
    expect(page.results[0]?.limit.amount).toBe(700_000);
  });

  it("keys outside the projection root, because no mutation can change it", () => {
    expect(contributionLimitKeys.all).toEqual(["contributionLimits"]);
    expect(contributionLimitKeys.all).not.toEqual(PORTFOLIO_KEY);
  });
});

describe("findLimit", () => {
  it("finds the row for one registration and year", () => {
    expect(findLimit(rows, "CA_TFSA", 2026)?.limit.amount).toBe(700_000);
  });

  it("returns undefined rather than a neighbouring year or registration", () => {
    // A limit for the wrong year is worse than no limit at all: the tax block
    // renders without it rather than stating a figure that does not apply.
    expect(findLimit(rows, "CA_TFSA", 2024)).toBeUndefined();
    expect(findLimit(rows, "CA_RRSP", 2026)).toBeUndefined();
  });
});
