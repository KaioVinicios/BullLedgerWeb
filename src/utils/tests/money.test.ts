import { describe, expect, it } from "vitest";

import {
  formatMoney,
  minorUnitsToDecimalString,
  parseMoneyInput,
} from "@/utils/money";

describe("minorUnitsToDecimalString", () => {
  it("inserts the decimal point without dividing", () => {
    expect(minorUnitsToDecimalString(123456)).toBe("1234.56");
  });

  it("pads amounts smaller than one unit", () => {
    expect(minorUnitsToDecimalString(5)).toBe("0.05");
    expect(minorUnitsToDecimalString(0)).toBe("0.00");
  });

  it("keeps the sign on negative amounts", () => {
    expect(minorUnitsToDecimalString(-5)).toBe("-0.05");
    expect(minorUnitsToDecimalString(-123456)).toBe("-1234.56");
  });

  it("survives amounts far beyond a float's exact range", () => {
    expect(minorUnitsToDecimalString(900719925474099)).toBe("9007199254740.99");
  });
});

describe("formatMoney", () => {
  it("formats BRL for a Brazilian locale", () => {
    const formatted = formatMoney({ amount: 123456, currency: "BRL" }, "pt-BR");

    expect(formatted).toContain("1.234,56");
  });

  it("formats USD for an American locale", () => {
    const formatted = formatMoney({ amount: 123456, currency: "USD" }, "en-US");

    expect(formatted).toContain("1,234.56");
  });

  it("formats CAD", () => {
    expect(formatMoney({ amount: 100, currency: "CAD" }, "en-CA")).toContain(
      "1.00",
    );
  });

  it("loses no precision on a very large amount", () => {
    const formatted = formatMoney(
      { amount: 900719925474099, currency: "USD" },
      "en-US",
    );

    expect(formatted).toContain("9,007,199,254,740.99");
  });
});

describe("parseMoneyInput", () => {
  it("parses a pt-BR formatted amount into minor units", () => {
    expect(parseMoneyInput("1.234,56", "BRL", "pt-BR")).toEqual({
      amount: 123456,
      currency: "BRL",
    });
  });

  it("parses an en-US formatted amount into minor units", () => {
    expect(parseMoneyInput("1,234.56", "USD", "en-US")).toEqual({
      amount: 123456,
      currency: "USD",
    });
  });

  it("pads a missing or short fraction", () => {
    expect(parseMoneyInput("12", "USD", "en-US")?.amount).toBe(1200);
    expect(parseMoneyInput("12.5", "USD", "en-US")?.amount).toBe(1250);
  });

  it("parses a negative amount", () => {
    expect(parseMoneyInput("-0,05", "BRL", "pt-BR")?.amount).toBe(-5);
  });

  it("round-trips through formatMoney", () => {
    const original = { amount: 987654321, currency: "BRL" as const };

    const parsed = parseMoneyInput(
      formatMoney(original, "pt-BR"),
      "BRL",
      "pt-BR",
    );

    expect(parsed).toEqual(original);
  });

  it("rejects more decimal places than the currency has", () => {
    expect(parseMoneyInput("1.234", "USD", "en-US")).toBeNull();
  });

  it("rejects input that is not a number", () => {
    expect(parseMoneyInput("", "USD", "en-US")).toBeNull();
    expect(parseMoneyInput("abc", "USD", "en-US")).toBeNull();
  });

  it("rejects an amount too large to hold exactly", () => {
    expect(parseMoneyInput("99999999999999999", "USD", "en-US")).toBeNull();
  });
});
