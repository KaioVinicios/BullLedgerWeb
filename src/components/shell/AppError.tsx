import { useEffect } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconAlertTriangle } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";

export function AppError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation("app");
  const router = useRouter();

  useEffect(() => {
    // The console is where a payload belongs. A user is never shown one — it
    // can carry an origin, a query, or a stack, and none of that is theirs to
    // read or act on.
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={IconAlertTriangle}
      title={t("error.title")}
      description={t("error.description")}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            {t("error.retry")}
          </Button>
          <Button asChild variant="outline">
            <Link to={PATHS.APP}>{t("error.action")}</Link>
          </Button>
        </div>
      }
    />
  );
}
