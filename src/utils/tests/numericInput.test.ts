import { describe, expect, it } from "vitest";

import {
  accumulate,
  caretAfterSignificant,
  countSignificantBefore,
  groupWholePart,
  sanitize,
  separatorsFor,
} from "@/utils/numericInput";

const EN = "en-US";
const PT = "pt-BR";

describe("separatorsFor", () => {
  it("reads each locale's separators from Intl", () => {
    expect(separatorsFor(EN)).toEqual({ group: ",", decimal: "." });
    expect(separatorsFor(PT)).toEqual({ group: ".", decimal: "," });
  });
});

describe("sanitize", () => {
  it("drops letters and leaves the digits alone", () => {
    expect(sanitize("12a3b", { locale: EN, decimals: true })).toBe("123");
  });

  it("drops the minus sign, because no field in this app takes one", () => {
    expect(sanitize("-12", { locale: EN, decimals: true })).toBe("12");
  });

  it("keeps the locale's own decimal separator", () => {
    expect(sanitize("12.5", { locale: EN, decimals: true })).toBe("12.5");
    expect(sanitize("12,5", { locale: PT, decimals: true })).toBe("12,5");
  });

  // The Android decimal keypad emits "." whatever the interface language is.
  it("normalizes a foreign decimal separator to the locale's", () => {
    expect(sanitize("12.5", { locale: PT, decimals: true })).toBe("12,5");
    expect(sanitize("12,5", { locale: EN, decimals: true })).toBe("12.5");
  });

  it("keeps only the first decimal separator", () => {
    expect(sanitize("1.2.3", { locale: EN, decimals: true })).toBe("1.23");
    expect(sanitize("1,2,3", { locale: PT, decimals: true })).toBe("1,23");
  });

  it("strips grouping, which the formatter re-derives", () => {
    expect(sanitize("1,234.5", { locale: EN, decimals: true })).toBe("1234.5");
    expect(sanitize("1.234,5", { locale: PT, decimals: true })).toBe("1234,5");
  });

  it("drops every separator when the field takes no decimals", () => {
    expect(sanitize("12.5", { locale: EN, decimals: false })).toBe("125");
    expect(sanitize("12,5", { locale: PT, decimals: false })).toBe("125");
  });

  it("keeps a trailing separator so the next digit can be typed", () => {
    expect(sanitize("12.", { locale: EN, decimals: true })).toBe("12.");
  });

  it("leaves an empty entry empty", () => {
    expect(sanitize("", { locale: EN, decimals: true })).toBe("");
    expect(sanitize("abc", { locale: EN, decimals: true })).toBe("");
  });
});

describe("accumulate", () => {
  it("fills from the right, one keystroke at a time", () => {
    const step = (raw: string) => accumulate(raw, { locale: EN, places: 2 });

    expect(step("2")).toBe("0.02");
    expect(step("0.02" + "0")).toBe("0.20");
    expect(step("0.20" + "0")).toBe("2.00");
    expect(step("2.00" + "0")).toBe("20.00");
    expect(step("20.00" + "0")).toBe("200.00");
  });

  it("groups the whole part once it is long enough", () => {
    expect(accumulate("123456789", { locale: EN, places: 2 })).toBe(
      "1,234,567.89",
    );
    expect(accumulate("123456789", { locale: PT, places: 2 })).toBe(
      "1.234.567,89",
    );
  });

  it("renders nothing for an entry with no digits", () => {
    expect(accumulate("", { locale: EN, places: 2 })).toBe("");
    expect(accumulate("abc", { locale: EN, places: 2 })).toBe("");
  });

  // Zero is not absence: AccountForm sends null for an empty contribution
  // room and { amount: 0 } for a used-up one.
  it("renders a typed zero rather than swallowing it", () => {
    expect(accumulate("0", { locale: EN, places: 2 })).toBe("0.00");
    expect(accumulate("00000", { locale: EN, places: 2 })).toBe("0.00");
  });

  it("drops leading zeros above the floor", () => {
    expect(accumulate("020000", { locale: EN, places: 2 })).toBe("200.00");
  });

  it("shortens from the right when a character is deleted", () => {
    expect(accumulate("200.0", { locale: EN, places: 2 })).toBe("20.00");
  });

  it("stops accepting digits at the ceiling rather than at submit", () => {
    const fifteen = "123456789012345";

    expect(accumulate(fifteen, { locale: EN, places: 2 })).toBe(
      "1,234,567,890,123.45",
    );
    expect(accumulate(fifteen + "6", { locale: EN, places: 2 })).toBe(
      "1,234,567,890,123.45",
    );
  });

  it("takes a places count other than two", () => {
    expect(accumulate("12345", { locale: EN, places: 0 })).toBe("12,345");
  });
});

describe("groupWholePart", () => {
  it("groups the whole part and leaves the fraction untouched", () => {
    expect(groupWholePart("1234567.8912", EN)).toBe("1,234,567.8912");
    expect(groupWholePart("1234567,8912", PT)).toBe("1.234.567,8912");
  });

  it("keeps a trailing separator, which a mid-typing value carries", () => {
    expect(groupWholePart("1234.", EN)).toBe("1,234.");
  });

  it("leaves a short value alone", () => {
    expect(groupWholePart("123", EN)).toBe("123");
    expect(groupWholePart("", EN)).toBe("");
  });
});

describe("countSignificantBefore", () => {
  it("counts digits, not characters", () => {
    // "1,234|,567" — five characters in, but four digits.
    expect(countSignificantBefore("1,234,567", 5)).toBe(4);
  });

  it("is zero at the start and the full count at the end", () => {
    expect(countSignificantBefore("1,234", 0)).toBe(0);
    expect(countSignificantBefore("1,234", 5)).toBe(4);
  });

  it("counts the decimal separator when given one", () => {
    expect(countSignificantBefore("1.", 2, ".")).toBe(2);
    expect(countSignificantBefore("1.", 2)).toBe(1);
  });
});

describe("caretAfterSignificant", () => {
  it("lands after the nth digit, skipping group separators", () => {
    expect(caretAfterSignificant("1,234,567", 4)).toBe(5);
    expect(caretAfterSignificant("1,234,567", 0)).toBe(0);
  });

  // The whole point: a separator appearing must not shift the caret off the
  // digit the user was typing behind.
  it("survives a group separator appearing to its left", () => {
    const before = countSignificantBefore("999", 3);

    expect(caretAfterSignificant("1,999", before + 1)).toBe(5);
  });

  // Without this the next digit lands on the wrong side of the point: a caret
  // that came to rest after `1.` would fall back to index 1, turning the `2`
  // that follows into `12.` rather than `1.2`.
  it("stays past a freshly typed decimal separator", () => {
    expect(caretAfterSignificant("1.", 2, ".")).toBe(2);
  });

  it("clamps to the end when asked for more than exist", () => {
    expect(caretAfterSignificant("1,234", 99)).toBe(5);
  });
});

describe("sanitize, by where the entry came from", () => {
  // A typed value is this module's own output plus one edit, so every group
  // separator in it is one this module put there.
  it("strips grouping outright when the value was typed", () => {
    expect(
      sanitize("1,0000", { locale: EN, decimals: true, entry: "typed" }),
    ).toBe("10000");
    expect(
      sanitize("1.0000", { locale: PT, decimals: true, entry: "typed" }),
    ).toBe("10000");
  });

  // A pasted value is a number somebody else wrote, where position is the only
  // evidence of what the separator meant.
  it("reads position when the value was pasted", () => {
    expect(
      sanitize("12.5", { locale: PT, decimals: true, entry: "pasted" }),
    ).toBe("12,5");
    expect(
      sanitize("1.234", { locale: PT, decimals: true, entry: "pasted" }),
    ).toBe("1234");
  });
});
