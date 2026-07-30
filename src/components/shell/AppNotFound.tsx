import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconMapPinOff } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";

/**
 * Attached to the guarded layout route, so it renders in the Outlet with the
 * navigation still beside it — a wrong address is a wrong turn, not an exit.
 *
 * The public not-found offers "back home", which for a signed-in user means
 * the pre-launch marketing page. This one offers the overview instead.
 */
export function AppNotFound() {
  const { t } = useTranslation("app");

  return (
    <EmptyState
      icon={IconMapPinOff}
      title={t("notFound.title")}
      description={t("notFound.description")}
      action={
        <Button asChild variant="outline">
          <Link to={PATHS.APP}>
            <IconArrowLeft aria-hidden />
            {t("notFound.action")}
          </Link>
        </Button>
      }
    />
  );
}
