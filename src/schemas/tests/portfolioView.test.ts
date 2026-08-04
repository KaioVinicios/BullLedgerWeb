import { describe, expect, it } from "vitest";

import {
  allocationSearchSchema,
  limitsSearchSchema,
  overviewSearchSchema,
} from "@/schemas/portfolioView";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

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
