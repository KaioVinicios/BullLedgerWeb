import { useTranslation } from "react-i18next";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { ThemeOptions } from "@/components/ThemeOptions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme.label")}>
          <IconSun className="dark:hidden" />
          <IconMoon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
