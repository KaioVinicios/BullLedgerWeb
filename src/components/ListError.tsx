import { useTranslation } from "react-i18next";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

/**
 * What a list shows when its fetch failed: the problem named in the app's own
 * words — never the raw payload — and the recovery beside it. Shaped like the
 * empty state (dashed, centered) because both mean "no rows to show", but the
 * icon and action tell the two situations apart.
 */
export function ListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("app");

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"
    >
      <IconAlertTriangle aria-hidden className="size-8 text-muted-foreground" />
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        {t("structure.loadFailed")}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <IconRefresh aria-hidden />
        {t("structure.retry")}
      </Button>
    </div>
  );
}
