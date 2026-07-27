import { describe, expect, it } from "vitest";

import {
  formatDecimal,
  formatPercent,
  isValidDecimalString,
  parseDecimalInput,
  SCALE,
} from "@/utils/decimal";

describe("SCALE", () => {
  it("matches the scales the OpenAPI schema declares", () => {
    expect(SCALE).toEqual({ quantity: 18, unitPrice: 12, rate: 8 });
  });
});

describe("isValidDecimalString", () => {
  it("accepts an 18-decimal crypto quantity", () => {
    expect(isValidDecimalString("0.000000000000000123", SCALE.quantity)).toBe(
      true,
    );
  });

  it("rejects more decimals than the scale allows", () => {
    expect(isValidDecimalString("0.123456789", SCALE.rate)).toBe(false);
  });

  it("accepts a negative value and a bare integer", () => {
    expect(isValidDecimalString("-12", SCALE.quantity)).toBe(true);
    expect(isValidDecimalString("12", SCALE.quantity)).toBe(true);
  });

  it("rejects non-numeric input and exponential notation", () => {
    expect(isValidDecimalString("abc", SCALE.quantity)).toBe(false);
    expect(isValidDecimalString("1e5", SCALE.quantity)).toBe(false);
    expect(isValidDecimalString("", SCALE.quantity)).toBe(false);
  });
});

describe("formatDecimal", () => {
  it("preserves all 18 decimals of a crypto quantity", () => {
    expect(formatDecimal("0.000000000000000123", "en-US", SCALE.quantity)).toBe(
      "0.000000000000000123",
    );
  });

  it("uses the locale's separators", () => {
    expect(formatDecimal("1234.5", "pt-BR", SCALE.unitPrice)).toBe("1.234,5");
  });

  it("does not pad to the full scale", () => {
    expect(formatDecimal("1.5", "en-US", SCALE.quantity)).toBe("1.5");
  });
});

describe("parseDecimalInput", () => {
  it("normalizes a pt-BR entry into a canonical decimal string", () => {
    expect(parseDecimalInput("1.234,5", "pt-BR", SCALE.unitPrice)).toBe(
      "1234.5",
    );
  });

  it("normalizes an en-US entry", () => {
    expect(parseDecimalInput("1,234.5", "en-US", SCALE.unitPrice)).toBe(
      "1234.5",
    );
  });

  it("rejects input exceeding the scale", () => {
    expect(parseDecimalInput("0.123456789", "en-US", SCALE.rate)).toBeNull();
  });

  it("rejects input that is not a number", () => {
    expect(parseDecimalInput("abc", "en-US", SCALE.quantity)).toBeNull();
  });
});

describe("formatPercent", () => {
  it("renders a decimal fraction as a percentage", () => {
    expect(formatPercent("0.1375", "en-US")).toContain("13.75");
  });

  it("keeps the sign on a negative fraction", () => {
    expect(formatPercent("-0.0125", "en-US")).toContain("-1.25");
  });
});
