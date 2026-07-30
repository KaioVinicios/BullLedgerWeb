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

  it("names one screen entry per navigable area", () => {
    expect(Object.keys(en.screens).sort()).toEqual([
      "accounts",
      "assets",
      "feedback",
      "help",
      "institutions",
      "ledger",
      "overview",
      "pricing",
      "profile",
      "targets",
    ]);
  });
});
