import { describe, expect, it } from "vitest";

import {
  allocationSearchSchema,
  holdingsDefaults,
  holdingsSearchSchema,
  limitsSearchSchema,
  overviewSearchSchema,
  salesDefaults,
  salesSearchSchema,
} from "@/schemas/portfolioView";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";

describe("overviewSearchSchema", () => {
  it("carries collapsed account ids", () => {
    expect(overviewSearchSchema.parse({ closed: [ACCOUNT_ID] })).toEqual({
      closed: [ACCOUNT_ID],
    });
  });

  it("treats absence as everything expanded", () => {
    expect(overviewSearchSchema.parse({})).toEqual({ closed: undefined });
  });

  it("renders rather than throws on a hand-edited URL", () => {
    expect(overviewSearchSchema.parse({ closed: "not-an-array" })).toEqual({
      closed: undefined,
    });
    expect(overviewSearchSchema.parse({ closed: ["not-a-uuid"] })).toEqual({
      closed: undefined,
    });
  });
});

describe("allocationSearchSchema", () => {
  it("accepts the three dimensions", () => {
    for (const dimension of ["archetype", "currency", "country"] as const) {
      expect(allocationSearchSchema.parse({ dimension })).toEqual({
        dimension,
      });
    }
  });

  it("falls back to the default on an unknown dimension", () => {
    expect(allocationSearchSchema.parse({ dimension: "sector" })).toEqual({
      dimension: undefined,
    });
  });
});

describe("limitsSearchSchema", () => {
  it("coerces a page and floors a bad one at 1", () => {
    expect(limitsSearchSchema.parse({ page: "3" })).toEqual({ page: 3 });
    expect(limitsSearchSchema.parse({ page: "zero" })).toEqual({ page: 1 });
  });

  it("treats absence as page 1, which the read site applies", () => {
    expect(limitsSearchSchema.parse({})).toEqual({ page: undefined });
  });
});

describe("holdingsSearchSchema", () => {
  it("rests on the custody pivot at set grain", () => {
    expect(holdingsDefaults).toEqual({ by: "account", grain: "set" });
    expect(holdingsSearchSchema.parse({})).toEqual({
      by: undefined,
      grain: undefined,
      closed: undefined,
    });
  });

  it("accepts both pivots and both grains", () => {
    expect(
      holdingsSearchSchema.parse({ by: "asset", grain: "instance" }),
    ).toEqual({ by: "asset", grain: "instance", closed: undefined });
  });

  it("falls back rather than throwing on a stale bookmark", () => {
    // A URL is untrusted input. A route error here would replace a screen the
    // user can still be shown, over a parameter with an obvious default.
    expect(holdingsSearchSchema.parse({ by: "sideways" })).toEqual({
      by: undefined,
      grain: undefined,
      closed: undefined,
    });
    expect(holdingsSearchSchema.parse({ grain: "atomic" })).toEqual({
      by: undefined,
      grain: undefined,
      closed: undefined,
    });
  });

  it("carries collapsed keys that are not uuids", () => {
    // The unaffiliated group is keyed by a sentinel, so the overview's
    // `z.uuid()` would throw away a real collapse.
    expect(holdingsSearchSchema.parse({ closed: ["none"] })).toEqual({
      by: undefined,
      grain: undefined,
      closed: ["none"],
    });
  });
});

describe("salesSearchSchema", () => {
  it("rests on most-recent-disposal-first, page one, with every filter absent", () => {
    expect(salesDefaults).toEqual({ ordering: "-sold_on", page: 1 });
    expect(salesSearchSchema.parse({})).toEqual({
      account: undefined,
      asset: undefined,
      archetype: undefined,
      sold_from: undefined,
      sold_to: undefined,
      result: undefined,
      ordering: undefined,
      include_archived: undefined,
      page: undefined,
    });
  });

  it("accepts a full filter set", () => {
    expect(
      salesSearchSchema.parse({
        account: ACCOUNT_ID,
        asset: ASSET_ID,
        archetype: "EXCHANGE_SECURITY",
        sold_from: "2026-01-01",
        sold_to: "2026-08-01",
        result: "PROFIT",
        ordering: "-profit_rate",
        include_archived: true,
        page: 2,
      }),
    ).toEqual({
      account: ACCOUNT_ID,
      asset: ASSET_ID,
      archetype: "EXCHANGE_SECURITY",
      sold_from: "2026-01-01",
      sold_to: "2026-08-01",
      result: "PROFIT",
      ordering: "-profit_rate",
      include_archived: true,
      page: 2,
    });
  });

  it("degrades a non-boolean include_archived to undefined rather than throwing", () => {
    // Archived lots stay hidden unless the flag is unambiguously true, the
    // same untrusted-URL posture every other field here takes.
    expect(salesSearchSchema.parse({ include_archived: "yes" })).toMatchObject({
      include_archived: undefined,
    });
  });

  it("falls back to undefined rather than throwing on a hand-edited URL", () => {
    // A URL is untrusted input. A route error here would replace a screen
    // the user can still be shown, over a parameter with an obvious default.
    expect(salesSearchSchema.parse({ ordering: "-random" })).toMatchObject({
      ordering: undefined,
    });
    expect(salesSearchSchema.parse({ account: "not-a-uuid" })).toMatchObject({
      account: undefined,
    });
    expect(salesSearchSchema.parse({ result: "BREAK_EVEN" })).toMatchObject({
      result: undefined,
    });
    expect(
      salesSearchSchema.parse({ archetype: "SOMETHING_NEW" }),
    ).toMatchObject({ archetype: undefined });
    expect(salesSearchSchema.parse({ sold_from: "not-a-date" })).toMatchObject({
      sold_from: undefined,
    });
  });
});
