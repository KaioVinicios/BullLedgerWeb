import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./language";

/**
 * The BCP 47 tag each interface language formats numbers, dates, and currency
 * with.
 *
 * Deliberately a fixed map rather than `navigator.language`. Reading the
 * browser's region would be truer to where a user physically sits, but it
 * would make every locale-sensitive assertion in the suite depend on a
 * browser setting the test has to pin first. This way the same language
 * always formats identically — in the browser, under Vitest, and under
 * Playwright.
 *
 * Separate concern from the reporting currency, which travels with the data:
 * a `pt` user holding USD sees `US$ 1.234,56`, not `$1,234.56`.
 *
 * Typed `Record<SupportedLanguage, string>` on purpose — adding a third
 * language becomes a compile error here rather than a silent fall back to
 * English at runtime.
 *
 * Like `language.ts`, this module must stay side-effect free: the Playwright
 * suite imports it in Node, where `i18n.init()` must not run.
 */
const FORMAT_LOCALE: Record<SupportedLanguage, string> = {
  en: "en-US",
  pt: "pt-BR",
};

/** The tag `fallbackLng: "en"` resolves to. */
export const DEFAULT_FORMAT_LOCALE = FORMAT_LOCALE.en;

function isSupported(language: string): language is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

export function formatLocaleFor(language: string | undefined): string {
  if (!language) return DEFAULT_FORMAT_LOCALE;

  return isSupported(language)
    ? FORMAT_LOCALE[language]
    : DEFAULT_FORMAT_LOCALE;
}
