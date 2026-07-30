import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

/**
 * The theme choices, without a menu around them.
 *
 * Two callers mount these: the standalone `ThemeToggle` on the public pages
 * wraps them in its own dropdown, and the account menu wraps them in a
 * submenu. The list of themes lives here so it can never say one thing in one
 * place and another in the other.
 */
export function ThemeOptions() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="light">
        <IconSun /> {t("theme.light")}
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <IconMoon /> {t("theme.dark")}
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <IconDeviceDesktop /> {t("theme.system")}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}
