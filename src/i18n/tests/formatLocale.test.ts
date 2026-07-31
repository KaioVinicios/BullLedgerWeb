import { describe, expect, it } from "vitest";

import { DEFAULT_FORMAT_LOCALE, formatLocaleFor } from "@/i18n/formatLocale";
import { SUPPORTED_LANGUAGES } from "@/i18n/language";

describe("formatLocaleFor", () => {
  it("maps every supported language to a tag Intl accepts", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const tag = formatLocaleFor(language);
      expect(Intl.NumberFormat.supportedLocalesOf(tag)).toEqual([tag]);
    }
  });

  it("formats Portuguese with Brazilian separators", () => {
    const formatter = new Intl.NumberFormat(formatLocaleFor("pt"));
    expect(formatter.format(1234.5)).toBe("1.234,5");
  });

  it("formats English with US separators", () => {
    const formatter = new Intl.NumberFormat(formatLocaleFor("en"));
    expect(formatter.format(1234.5)).toBe("1,234.5");
  });

  // A formatter handed `undefined` silently adopts the *browser's* locale,
  // which is the one wrong outcome that would be invisible in review.
  it("falls back to a real tag rather than returning undefined", () => {
    expect(formatLocaleFor("fr")).toBe(DEFAULT_FORMAT_LOCALE);
    expect(formatLocaleFor(undefined)).toBe(DEFAULT_FORMAT_LOCALE);
    expect(formatLocaleFor("")).toBe(DEFAULT_FORMAT_LOCALE);
  });
});
