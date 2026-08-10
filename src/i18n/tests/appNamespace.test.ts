import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en/app.json";
import pt from "@/i18n/locales/pt/app.json";

/** Every leaf key, dotted — "nav.overview", not "nav". */
function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("the app namespace", () => {
  it("has exactly the same keys in both locales", () => {
    // English is the source of truth the type checker enforces; this is what
    // stops pt/ from silently drifting out from under it.
    expect(leafKeys(pt).sort()).toEqual(leafKeys(en).sort());
  });

  it("has no blank strings in either locale", () => {
    for (const [locale, resource] of [
      ["en", en],
      ["pt", pt],
    ] as const) {
      for (const key of leafKeys(resource)) {
        const value = key
          .split(".")
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            resource,
          );
        expect(String(value).trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("no longer promises a pricing screen that has shipped", () => {
    // `comingSoon` is a list of honest admissions, not a permanent fixture.
    // A screen that exists and says it is coming is worse than no copy at all.
    expect(en.comingSoon).not.toHaveProperty("pricing");
    expect(pt.comingSoon).not.toHaveProperty("pricing");
  });

  it("names one screen entry per navigable area", () => {
    // "Navigable" is wider than the sidebar: `allocation` is reached from the
    // overview's breakdown block rather than from primary navigation, and it
    // is still a screen with its own address and heading.
    expect(Object.keys(en.screens).sort()).toEqual([
      "accounts",
      "allocation",
      "assets",
      "feedback",
      "help",
      // Two entries, one letter apart, and both are real: `holding` is one
      // position's detail and `holdings` is the index of them all.
      "holding",
      "holdings",
      "institutions",
      "ledger",
      "limits",
      "overview",
      "pricing",
      "profile",
      "sales",
      "targets",
    ]);
  });
});
