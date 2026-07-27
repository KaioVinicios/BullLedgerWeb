import { describe, expect, it } from "vitest";

import { expectedCashMinorUnits, matchesTradeIdentity } from "@/utils/trade";

describe("expectedCashMinorUnits", () => {
  it("multiplies quantity by unit price and rounds to minor units", () => {
    expect(expectedCashMinorUnits("10", "12.34")).toBe(12340);
  });

  it("keeps full precision on a crypto quantity", () => {
    expect(expectedCashMinorUnits("0.00000001", "100000000")).toBe(100);
  });

  it("rounds half to even", () => {
    expect(expectedCashMinorUnits("1", "0.005")).toBe(0);
    expect(expectedCashMinorUnits("1", "0.015")).toBe(2);
  });

  it("keeps the sign of a disposal", () => {
    expect(expectedCashMinorUnits("-10", "12.34")).toBe(-12340);
  });
});

describe("matchesTradeIdentity", () => {
  it("accepts a consistent trade", () => {
    expect(
      matchesTradeIdentity({
        quantity: "10",
        unitPrice: "12.34",
        money: { amount: 12340, currency: "BRL" },
      }),
    ).toBe(true);
  });

  it("rejects a trade whose cash does not follow from the inputs", () => {
    expect(
      matchesTradeIdentity({
        quantity: "10",
        unitPrice: "12.34",
        money: { amount: 12341, currency: "BRL" },
      }),
    ).toBe(false);
  });

  it("compares magnitudes, so a sign convention difference is not a mismatch", () => {
    expect(
      matchesTradeIdentity({
        quantity: "10",
        unitPrice: "12.34",
        money: { amount: -12340, currency: "BRL" },
      }),
    ).toBe(true);
  });
});
