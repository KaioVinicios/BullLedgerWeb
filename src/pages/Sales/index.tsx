/**
 * Sales history — every lot that has been sold from, and what it returned.
 *
 * A sibling of the holdings screen rather than a replacement: that one
 * answers what a position is worth now, this one what a contribution
 * returned when it was disposed of. `SalesFilters` owns the controls; this
 * screen only merges what it reports into the previous search and renders
 * whatever `search` already holds, the same loading / error / empty / table
 * branch order `Lots.tsx` uses.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconReceipt2 } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { SalesFilters } from "@/pages/Sales/SalesFilters";
import { SalesTable } from "@/pages/Sales/SalesTable";
import { PATHS } from "@/routes/path";
import { salesDefaults } from "@/schemas/portfolioView";
import { listSales, salesKeys, type SalesListQuery } from "@/services/sales";

const route = getRouteApi(PATHS.SALES);

export function SalesPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const page = search.page ?? salesDefaults.page;

  const query: SalesListQuery = {
    page,
    account: search.account,
    asset: search.asset,
    archetype: search.archetype,
    sold_from: search.sold_from,
    sold_to: search.sold_to,
    result: search.result,
    ordering: search.ordering ?? salesDefaults.ordering,
    // `false` stays out of the request the way it stays out of the URL:
    // absent, matching the endpoint's own default of hiding archived lots.
    include_archived: search.include_archived || undefined,
  };

  const list = usePaginatedQuery({
    queryKey: salesKeys.list(query),
    queryFn: () => listSales(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  // `include_archived` deliberately does not participate: it is a view
  // option, not an exclusionary filter — turning it on only ever adds rows —
  // the same reason `Ledger/index.tsx`'s `include_voided` and
  // `Assets/index.tsx`'s `include_archived` stay out of their own
  // `isFiltered`.
  const isFiltered =
    search.account !== undefined ||
    search.asset !== undefined ||
    search.archetype !== undefined ||
    search.sold_from !== undefined ||
    search.sold_to !== undefined ||
    search.result !== undefined;

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.sales.title")}
        description={t("screens.sales.description")}
      />

      <div className="space-y-4">
        <SalesFilters
          search={search}
          onChange={(next) =>
            // A changed filter narrows or widens the result set, so it must
            // land back on page 1 — the same reset `Ledger/index.tsx`'s
            // `setFilter` and `Assets/index.tsx`'s filter handlers apply.
            void navigate({
              search: (prev) => ({ ...prev, ...next, page: 1 }),
            })
          }
        />

        {list.error ? (
          <ListError onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <ListSkeleton />
        ) : list.count === 0 ? (
          <EmptyState
            icon={IconReceipt2}
            title={t("screens.sales.title")}
            description={isFiltered ? t("sales.noMatch") : t("sales.empty")}
          />
        ) : (
          <SalesTable rows={list.rows} />
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
