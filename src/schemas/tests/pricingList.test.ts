import { describe, expect, it } from "vitest";

import {
  fxListSearchSchema,
  newQuoteSearchSchema,
  pricingListSearchSchema,
} from "@/schemas/pricingList";

const ASSET = "22222222-2222-4222-8222-222222222222";

describe("pricingListSearchSchema", () => {
  it("keeps a valid asset filter and page", () => {
    expect(pricingListSearchSchema.parse({ asset: ASSET, page: 3 })).toEqual({
      asset: ASSET,
      page: 3,
    });
  });

  it("falls back rather than throwing at whoever edited the address bar", () => {
    // A URL is untrusted input. A stale bookmark should render the screen,
    // never a route error. `page` catches to 1 through `pageSchema`'s own
    // fallback; `asset` catches to undefined, which reads as "no filter".
    expect(
      pricingListSearchSchema.parse({ asset: "not-a-uuid", page: "banana" }),
    ).toEqual({ asset: undefined, page: 1 });
  });

  it("treats an absent search as the resting state", () => {
    expect(pricingListSearchSchema.parse({})).toEqual({
      asset: undefined,
      page: undefined,
    });
  });
});

describe("fxListSearchSchema", () => {
  it("keeps a valid currency pair", () => {
    expect(fxListSearchSchema.parse({ base: "BRL", quote: "USD" })).toEqual({
      base: "BRL",
      quote: "USD",
      page: undefined,
    });
  });

  it("drops a currency the enum does not carry", () => {
    expect(fxListSearchSchema.parse({ base: "EUR", quote: "USD" })).toEqual({
      base: undefined,
      quote: "USD",
      page: undefined,
    });
  });
});

describe("newQuoteSearchSchema", () => {
  it("carries the prefilled asset", () => {
    expect(newQuoteSearchSchema.parse({ asset: ASSET })).toEqual({
      asset: ASSET,
    });
  });

  it("drops an unusable prefill instead of pre-selecting nonsense", () => {
    expect(newQuoteSearchSchema.parse({ asset: "??" })).toEqual({
      asset: undefined,
    });
  });
});
