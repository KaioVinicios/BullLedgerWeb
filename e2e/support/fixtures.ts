import { test as base, expect } from "@playwright/test";

import { LANGUAGE_STORAGE_KEY, type SupportedLanguage } from "@/i18n/language";

/**
 * The project's `test`, which differs from Playwright's in exactly one way: it
 * pins the interface language before the app boots.
 *
 * Every visible string in this app is translated, so a spec asserting on copy
 * is asserting on a locale whether it admits it or not — left to the language
 * detector, the same assertion passes on an English machine and fails on a
 * Portuguese one. `addInitScript` runs before any page script, which is the
 * only moment early enough: i18next reads `localStorage` during `init()`, and
 * `init()` runs on the first import of `@/i18n/config`.
 *
 * English is the default because it is the source of truth the type checker
 * enforces the other locales against. A spec that cares about translation
 * declares `test.use({ language: "pt" })` and asserts on the pt resources.
 *
 * `language`, not `locale`: Playwright already owns that name for the
 * browser's own locale, which is a different thing — the app reads the stored
 * preference first and only falls back to the navigator.
 */
export const test = base.extend<{ language: SupportedLanguage }>({
  language: ["en", { option: true }],

  page: async ({ page, language }, use) => {
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [LANGUAGE_STORAGE_KEY, language] as const,
    );

    await use(page);
  },
});

export { expect };
