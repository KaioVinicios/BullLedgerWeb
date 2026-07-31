import { useTranslation } from "react-i18next";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface ListPaginationProps {
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Page steps for a resource list. Renders nothing on a single page — most
 * personal portfolios never fill one, and a pager over 12 rows is chrome
 * asserting itself. Neighbour existence comes from the server's `next` /
 * `previous`, so the buttons can never step onto a page that is not there.
 */
export function ListPagination({
  page,
  pageCount,
  hasPrevious,
  hasNext,
  onPageChange,
}: ListPaginationProps) {
  const { t } = useTranslation("app");

  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={t("structure.pagination.label")}
      className="flex items-center justify-between gap-4"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("structure.pagination.status", { page, pageCount })}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          <IconChevronLeft aria-hidden />
          {t("structure.pagination.previous")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          {t("structure.pagination.next")}
          <IconChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
