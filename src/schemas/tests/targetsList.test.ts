import { describe, expect, it } from "vitest";

import {
  newTargetSearchSchema,
  PAGE_PARAM,
  targetsListSearchSchema,
} from "@/schemas/targetsList";

describe("targetsListSearchSchema", () => {
  it("leaves every field absent by default, so no link has to carry a search", () => {
    expect(targetsListSearchSchema.parse({})).toEqual({});
  });

  it("keeps the three sections paginating independently", () => {
    expect(
      targetsListSearchSchema.parse({ holdingPage: 2, portfolioPage: 3 }),
    ).toEqual({ holdingPage: 2, portfolioPage: 3 });
  });

  it("falls back per field on hand-edited values instead of throwing", () => {
    // `pageSchema` catches to 1 internally, so a junk page renders page 1
    // rather than disappearing — same behaviour as every other list schema.
    expect(
      targetsListSearchSchema.parse({
        holdingPage: "banana",
        include_archived: "yes",
      }),
    ).toEqual({
      holdingPage: 1,
      accountPage: undefined,
      portfolioPage: undefined,
      include_archived: undefined,
    });
  });

  it("names one URL parameter per scope", () => {
    expect(PAGE_PARAM).toEqual({
      HOLDING: "holdingPage",
      ACCOUNT_ARCHETYPE: "accountPage",
      PORTFOLIO_ARCHETYPE: "portfolioPage",
    });
  });
});

describe("newTargetSearchSchema", () => {
  it("accepts the prefill a holding's link writes", () => {
    expect(
      newTargetSearchSchema.parse({
        scope: "HOLDING",
        account: "11111111-1111-4111-8111-111111111111",
        asset: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({
      scope: "HOLDING",
      account: "11111111-1111-4111-8111-111111111111",
      asset: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("drops a hand-edited scope rather than failing the route", () => {
    expect(newTargetSearchSchema.parse({ scope: "NONSENSE" })).toEqual({});
  });

  it("drops a malformed id, which would select nothing silently", () => {
    expect(newTargetSearchSchema.parse({ account: "not-a-uuid" })).toEqual({});
  });
});
