import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en/app.json";
import pt from "@/i18n/locales/pt/app.json";
import { FOOTER_ITEMS, LEGAL_LINKS, NAV_SECTIONS } from "@/config/navigation";
import { PATHS } from "@/routes/path";

const items = NAV_SECTIONS.flatMap((section) => section.items);

describe("the navigation model", () => {
  it("points every item at a path from PATHS", () => {
    const known = new Set<string>(Object.values(PATHS));

    for (const item of items) {
      expect(known.has(item.path), item.path).toBe(true);
    }
  });

  it("resolves every label in both locales", () => {
    for (const item of items) {
      expect(en.nav[item.labelKey], `en.nav.${item.labelKey}`).toBeTruthy();
      expect(pt.nav[item.labelKey], `pt.nav.${item.labelKey}`).toBeTruthy();
    }
  });

  it("resolves every section label in both locales", () => {
    for (const section of NAV_SECTIONS) {
      if (section.labelKey === null) continue;
      expect(en.sections[section.labelKey]).toBeTruthy();
      expect(pt.sections[section.labelKey]).toBeTruthy();
    }
  });

  it("matches the overview item exactly, so it does not stay lit everywhere", () => {
    // Every child route lives under /app, and activeOptions.exact defaults to
    // false — without this flag the index link is active on every screen.
    const overview = items.find((item) => item.path === PATHS.APP);

    expect(overview?.exact).toBe(true);
  });

  it("lists no item twice", () => {
    expect(new Set(items.map((item) => item.path)).size).toBe(items.length);
  });
});

describe("the sidebar footer model", () => {
  it("points every footer item at a path from PATHS", () => {
    const known = new Set<string>(Object.values(PATHS));

    for (const item of FOOTER_ITEMS) {
      expect(known.has(item.path), item.path).toBe(true);
    }
  });

  it("resolves every footer label in both locales", () => {
    for (const item of FOOTER_ITEMS) {
      expect(en.footer.links[item.labelKey]).toBeTruthy();
      expect(pt.footer.links[item.labelKey]).toBeTruthy();
    }
  });

  it("resolves every legal label in both locales", () => {
    for (const link of LEGAL_LINKS) {
      expect(en.footer.legal[link.labelKey]).toBeTruthy();
      expect(pt.footer.legal[link.labelKey]).toBeTruthy();
    }
  });

  it("keeps the legal links on public paths, outside the guarded prefix", () => {
    // They open the canonical public document in a new tab. A path under /app
    // would mean a second address for the same legal text.
    for (const link of LEGAL_LINKS) {
      expect(link.path.startsWith(`${PATHS.APP}/`), link.path).toBe(false);
    }
  });

  it("never repeats a primary destination in the footer", () => {
    const primary = new Set(items.map((item) => item.path));

    for (const item of FOOTER_ITEMS) {
      expect(primary.has(item.path), item.path).toBe(false);
    }
  });
});
