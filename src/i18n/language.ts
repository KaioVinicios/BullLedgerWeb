/**
 * The two facts about language that something other than i18next needs to
 * know, kept apart from `config.ts` because importing that module *runs* it:
 * it calls `i18n.init()` and writes `<html lang>`, neither of which a Node
 * process — the Playwright suite pinning a locale before the app boots — can
 * do or should trigger.
 *
 * `config.ts` re-exports both, so nothing has to learn a second import path.
 */

export const SUPPORTED_LANGUAGES = ["en", "pt"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Where the detector caches the chosen language. A test that asserts on
 * translated copy has to write this key before the first paint, or the same
 * assertion passes in one language and fails in the other.
 */
export const LANGUAGE_STORAGE_KEY = "bullledger-lang";
