import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enErrors from "./locales/en/errors.json";
import enApp from "./locales/en/app.json";
import enExplain from "./locales/en/explain.json";
import ptCommon from "./locales/pt/common.json";
import ptAuth from "./locales/pt/auth.json";
import ptErrors from "./locales/pt/errors.json";
import ptApp from "./locales/pt/app.json";
import ptExplain from "./locales/pt/explain.json";
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "./language";

export { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "./language";
export type { SupportedLanguage } from "./language";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        errors: enErrors,
        app: enApp,
        explain: enExplain,
      },
      pt: {
        common: ptCommon,
        auth: ptAuth,
        errors: ptErrors,
        app: ptApp,
        explain: ptExplain,
      },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    // Map regional tags (pt-BR, en-US) down to the base language we ship.
    load: "languageOnly",
    ns: ["common", "auth", "errors", "app", "explain"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    // Resources are bundled, so init runs synchronously and no Suspense
    // boundary is needed to avoid a flash of untranslated keys.
    initAsync: false,
    react: { useSuspense: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Keep <html lang> in sync for accessibility and correct hyphenation.
const applyHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
applyHtmlLang(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", applyHtmlLang);

export default i18n;
