import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconChevronDown,
  IconLanguage,
  IconLoader2,
  IconLogout,
  IconSun,
  IconUser,
} from "@tabler/icons-react";

import { LanguageOptions } from "@/components/LanguageOptions";
import { ThemeOptions } from "@/components/ThemeOptions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";
import { PATHS } from "@/routes/path";

/** All an avatar this size has room for. */
function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function AccountMenu() {
  const { t } = useTranslation("app");
  const { user } = useCurrentUser();
  const logout = useLogout();

  // The guard resolved the session before this shell ever mounted, so this
  // reads from cache and never renders a loading state of its own.
  const email = user?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{initials(email)}</AvatarFallback>
          </Avatar>
          {/* Always in the accessible name, visible only where there is room:
              the avatar alone would leave the trigger unnamed on mobile. */}
          <span className="sr-only max-w-40 truncate text-sm sm:not-sr-only">
            {email}
          </span>
          <IconChevronDown
            aria-hidden
            className="size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("accountMenu.signedInAs")}</DropdownMenuLabel>
        <DropdownMenuLabel className="pt-0 text-sm font-normal text-foreground">
          {email}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to={PATHS.PROFILE}>
            <IconUser aria-hidden />
            {t("accountMenu.profile")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconSun aria-hidden />
            {t("accountMenu.theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <ThemeOptions />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconLanguage aria-hidden />
            {t("accountMenu.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <LanguageOptions />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={logout.isPending}
          // Keeps the menu open while the request is in flight, so the pending
          // state is visible rather than flashing as the menu closes.
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
        >
          {logout.isPending ? (
            <>
              <IconLoader2 className="animate-spin" aria-hidden />
              {t("accountMenu.loggingOut")}
            </>
          ) : (
            <>
              <IconLogout aria-hidden />
              {t("accountMenu.logout")}
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
