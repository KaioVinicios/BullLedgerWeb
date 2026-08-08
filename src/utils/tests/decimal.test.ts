import { describe, expect, it } from "vitest";

import {
  formatDecimal,
  formatPercent,
  fractionToPercent,
  isValidDecimalString,
  parseDecimalInput,
  percentToFraction,
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

describe("percent conversion", () => {
  it("shifts a typed percent into the wire's fraction", () => {
    expect(percentToFraction("13.75", "en-US")).toBe("0.1375");
    expect(percentToFraction("13,75", "pt-BR")).toBe("0.1375");
    expect(percentToFraction("0", "en-US")).toBe("0");
  });

  it("shifts back for a prefill, in the reader's locale", () => {
    expect(fractionToPercent("0.1375", "en-US")).toBe("13.75");
    expect(fractionToPercent("0.1375", "pt-BR")).toBe("13,75");
    expect(fractionToPercent(null, "en-US")).toBe("");
    expect(fractionToPercent(undefined, "en-US")).toBe("");
  });

  /**
   * `PercentField` fills from the right at two places, so a prefill carrying
   * fewer would be re-read as digits on the first keystroke: `6.5` typed into
   * becomes `0.65`, silently dividing the user's rate by ten. Padding here is
   * value-preserving — `6.5` and `6.50` shift to the same fraction — and it is
   * the one funnel every percent prefill in the app already passes through.
   */
  it("pads a prefill to the two places the field's mask holds", () => {
    expect(fractionToPercent("0.015", "en-US")).toBe("1.50");
    expect(fractionToPercent("0.12", "en-US")).toBe("12.00");
    expect(fractionToPercent("0.015", "pt-BR")).toBe("1,50");
  });

  it("keeps precision beyond two places rather than padding it away", () => {
    expect(fractionToPercent("0.13755", "en-US")).toBe("13.755");
  });

  it("survives the round trip at the scale the shift leaves room for", () => {
    const typed = "12.345678";
    const fraction = percentToFraction(typed, "en-US");

    expect(fraction).toBe("0.12345678");
    expect(fractionToPercent(fraction, "en-US")).toBe(typed);
  });

  it("refuses precision the shift cannot hold", () => {
    // PERCENT_SCALE is SCALE.rate - 2, so a seventh decimal has nowhere to go.
    expect(percentToFraction("1.2345678", "en-US")).toBeNull();
  });

  it("refuses what is not a number", () => {
    expect(percentToFraction("", "en-US")).toBeNull();
    expect(percentToFraction("abc", "en-US")).toBeNull();
  });
});
