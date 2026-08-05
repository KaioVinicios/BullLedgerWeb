import { describe, expect, it } from "vitest";

import {
  COST_BASIS_METHOD_BY_COUNTRY,
  COUNTRIES,
  PERIODS,
  TARGET_SCOPES,
  TARGET_STATUSES,
} from "@/schemas/apiEnums";

describe("COST_BASIS_METHOD_BY_COUNTRY", () => {
  it("gives every country a method", () => {
    for (const country of COUNTRIES) {
      expect(COST_BASIS_METHOD_BY_COUNTRY[country]).toBeDefined();
    }
  });

  it("uses weighted average where the tax code averages, FIFO where it queues", () => {
    // business-rules.md §Cost basis by country: BR preço médio, CA adjusted
    // cost base, US FIFO / specific-lot.
    expect(COST_BASIS_METHOD_BY_COUNTRY.BR).toBe("WEIGHTED_AVERAGE");
    expect(COST_BASIS_METHOD_BY_COUNTRY.CA).toBe("WEIGHTED_AVERAGE");
    expect(COST_BASIS_METHOD_BY_COUNTRY.US).toBe("FIFO");
  });
});

describe("target enums", () => {
  it("lists the scopes in resolution order, most specific first", () => {
    // The order is load-bearing: the list screen renders its sections in this
    // order, and the order *is* the rule being taught.
    expect(TARGET_SCOPES).toEqual([
      "HOLDING",
      "ACCOUNT_ARCHETYPE",
      "PORTFOLIO_ARCHETYPE",
    ]);
  });

  it("lists the periods shortest first", () => {
    expect(PERIODS).toEqual(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]);
  });

  it("lists every status", () => {
    expect([...TARGET_STATUSES].sort()).toEqual([
      "AHEAD",
      "BEHIND",
      "BELOW_FLOOR",
      "ON_TRACK",
    ]);
  });
});
