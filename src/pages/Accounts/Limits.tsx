/**
 * The yearly contribution limits, read-only.
 *
 * It wears the resource-list pattern — `ListSkeleton`, `ListError`,
 * `EmptyState`, `ListPagination` — with three deliberate absences.
 *
 * **No create action and no archived toggle**, because this is reference data
 * the client cannot write at all.
 *
 * **No sortable header**, because `GET /api/contribution-limits/` declares no
 * `ordering` parameter. That is the rule the ledger and the pricing list
 * already follow: a control that cannot work is not offered.
 *
 * **No registration filter**, and not for want of wanting one. The endpoint
 * declares neither `registration` nor `year`, and filtering a paginated list in
 * the client lies the moment a second page exists — the rows drop out and
 * `count` does not, which is the trap Phase 5 named. The filter is a backend
 * request instead: `docs/backend-requests/2026-08-03-reporting.md`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconScale } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { MoneyValue } from "@/components/MoneyValue";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PATHS } from "@/routes/path";
import {
  contributionLimitKeys,
  listContributionLimits,
  type ContributionLimitListQuery,
} from "@/services/contributionLimits";

const route = getRouteApi(PATHS.ACCOUNTS_LIMITS);

export function ContributionLimitsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const page = search.page ?? 1;
  const query: ContributionLimitListQuery = { page };

  const list = usePaginatedQuery({
    queryKey: contributionLimitKeys.list(query),
    queryFn: () => listContributionLimits(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.limits.title")}
        description={t("screens.limits.description")}
      />

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("limits.reference")}</p>

        {list.error ? (
          <ListError onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <ListSkeleton />
        ) : list.count === 0 ? (
          <EmptyState
            icon={IconScale}
            title={t("limits.empty.title")}
            description={t("limits.empty.description")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("limits.columns.registration")}</TableHead>
                  <TableHead>{t("limits.columns.year")}</TableHead>
                  <TableHead className="text-right">
                    {t("limits.columns.limit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {t(`enums.registration.${row.registration}`)}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {row.year}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyValue value={row.limit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ListPagination
          page={list.page}
          pageCount={list.pageCount}
          hasPrevious={list.hasPrevious}
          hasNext={list.hasNext}
          onPageChange={list.setPage}
        />
      </div>
    </PageContainer>
  );
}
