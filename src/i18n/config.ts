import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import ptCommon from "./locales/pt/common.json";
import ptAuth from "./locales/pt/auth.json";

export const SUPPORTED_LANGUAGES = ["en", "pt"] as const;
export const LANGUAGE_STORAGE_KEY = "bullledger-lang";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth },
      pt: { common: ptCommon, auth: ptAuth },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    // Map regional tags (pt-BR, en-US) down to the base language we ship.
    load: "languageOnly",
    ns: ["common", "auth"],
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
