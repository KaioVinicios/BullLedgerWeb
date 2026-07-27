import { describe, expect, it } from "vitest";

import {
  formatCalendarDate,
  formatInstant,
  isCalendarDate,
  toCalendarDate,
  todayCalendarDate,
} from "@/utils/date";

describe("isCalendarDate", () => {
  it("accepts an ISO calendar date", () => {
    expect(isCalendarDate("2026-07-26")).toBe(true);
  });

  it("rejects a datetime, a partial date, and junk", () => {
    expect(isCalendarDate("2026-07-26T00:00:00Z")).toBe(false);
    expect(isCalendarDate("2026-07")).toBe(false);
    expect(isCalendarDate("26/07/2026")).toBe(false);
  });

  it("rejects an impossible date", () => {
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
  });
});

describe("toCalendarDate", () => {
  it("returns the value when it is a calendar date", () => {
    expect(toCalendarDate("2026-07-26")).toBe("2026-07-26");
  });

  it("returns null otherwise", () => {
    expect(toCalendarDate("nope")).toBeNull();
  });
});

describe("formatCalendarDate", () => {
  it("renders the same calendar day regardless of the host timezone", () => {
    // `new Date("2026-07-26")` is UTC midnight, which is July 25th in every
    // negative-offset zone — the drift this module exists to prevent.
    const formatted = formatCalendarDate(
      toCalendarDate("2026-07-26")!,
      "en-US",
    );

    expect(formatted).toContain("26");
    expect(formatted).not.toContain("25");
  });

  it("uses the locale's date order", () => {
    const date = toCalendarDate("2026-07-26")!;

    expect(formatCalendarDate(date, "pt-BR")).toBe("26/07/2026");
  });
});

describe("formatInstant", () => {
  it("renders a date-time with a time component", () => {
    const formatted = formatInstant("2026-07-26T14:30:00Z", "en-US");

    expect(formatted).toMatch(/\d/);
    expect(formatted.length).toBeGreaterThan("7/26/2026".length);
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatInstant("nope", "en-US")).toBe("");
  });
});

describe("todayCalendarDate", () => {
  it("returns a valid calendar date", () => {
    expect(isCalendarDate(todayCalendarDate())).toBe(true);
  });
});
