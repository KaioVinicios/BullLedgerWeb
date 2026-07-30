import { useTranslation } from "react-i18next";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n/language";

/** The language choices, without a menu around them. See `ThemeOptions`. */
export function LanguageOptions() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <DropdownMenuRadioGroup
      value={current}
      onValueChange={(value) => void i18n.changeLanguage(value)}
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <DropdownMenuRadioItem key={language} value={language}>
          {t(`language.${language}`)}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
