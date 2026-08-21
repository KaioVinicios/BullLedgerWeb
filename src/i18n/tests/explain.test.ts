import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en/explain.json";
import pt from "@/i18n/locales/pt/explain.json";

/** Every leaf key, dotted — "portfolio.real_return.body", not "portfolio". */
function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** Every explainer entry, as [key, entry] — "trigger" is not one. */
function entries(resource: Record<string, unknown>) {
  return Object.entries(resource)
    .filter(([, value]) => typeof value === "object" && value !== null)
    .flatMap(([namespace, leaves]) =>
      Object.entries(leaves as Record<string, unknown>).map(
        ([leaf, entry]) =>
          [`${namespace}.${leaf}`, entry as Record<string, string>] as const,
      ),
    );
}

describe("the explain namespace", () => {
  it("has exactly the same keys in both locales", () => {
    // These keys are the API's own metric ids, shared with
    // docs/backend/metrics.md. A key present in one locale and missing from
    // the other reaches production as a raw key on screen.
    expect(leafKeys(pt).sort()).toEqual(leafKeys(en).sort());
  });

  it("gives every entry a label and a body, in both locales", () => {
    for (const [locale, resource] of [
      ["en", en],
      ["pt", pt],
    ] as const) {
      for (const [key, entry] of entries(resource)) {
        expect(entry.label?.trim(), `${locale}.${key}.label`).toBeTruthy();
        expect(entry.body?.trim(), `${locale}.${key}.body`).toBeTruthy();
      }
    }
  });

  it("keeps every body inside the popover budget", () => {
    // 220 characters is roughly two sentences. Past that it is a document,
    // and a document belongs on the Help screen, not in a popover.
    for (const [locale, resource] of [
      ["en", en],
      ["pt", pt],
    ] as const) {
      for (const [key, entry] of entries(resource)) {
        expect(entry.body.length, `${locale}.${key}.body`).toBeLessThanOrEqual(
          220,
        );
      }
    }
  });

  it("names every entry with the API's metric key shape", () => {
    // namespace.leaf, both snake_case, matching docs/backend/metrics.md
    // verbatim. A key that has to be transliterated before it can be
    // compared is a key that will drift from the document it came from.
    for (const [key] of entries(en)) {
      expect(key, key).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
    }
  });

  it("carries exactly one non-entry key, the trigger label", () => {
    const scalars = Object.entries(en).filter(
      ([, value]) => typeof value !== "object",
    );

    expect(scalars.map(([key]) => key)).toEqual(["trigger"]);
    expect(en.trigger).toContain("{{label}}");
  });
});
