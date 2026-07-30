import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a route shows while its chunk downloads. Shaped like a page header over
 * a content block, so the layout does not jump when the real screen arrives.
 */
export function PageSkeleton() {
  const { t } = useTranslation("app");

  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
