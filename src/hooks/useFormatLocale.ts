import { useTranslation } from "react-i18next";

import { formatLocaleFor } from "@/i18n/formatLocale";

/**
 * The BCP 47 tag every figure on screen formats with.
 *
 * Read through `useTranslation` rather than off the i18n singleton directly:
 * the hook subscribes to `languageChanged`, so switching language re-renders
 * every figure currently mounted. Reading `i18n.resolvedLanguage` without a
 * subscription would leave a screen full of amounts still formatted in the
 * language the user just left.
 */
export function useFormatLocale(): string {
  const { i18n } = useTranslation();

  return formatLocaleFor(i18n.resolvedLanguage);
}
