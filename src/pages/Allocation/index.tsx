/**
 * How the portfolio divides, across three dimensions.
 *
 * A read, and only a read. Every figure here is the server's own — the client
 * never sums a column, never derives a share, and offers no control that would
 * write anything.
 *
 * Two of the three dimensions exist nowhere else. `by_archetype` duplicates the
 * overview's own breakdown, which is why the overview links here rather than
 * repeating currency and country in a second place.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconCheck, IconChartPie } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { Dimension } from "@/pages/Allocation/Dimension";
import { PATHS } from "@/routes/path";
import type { Archetype } from "@/schemas/apiEnums";
import {
  ALLOCATION_DIMENSIONS,
  allocationDefaults,
  type AllocationDimension,
} from "@/schemas/portfolioView";
import { allocationQuery, type AllocationSlice } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";

const route = getRouteApi(PATHS.ALLOCATION);

/** The allocation-only sixth bucket: cash that is not in any holding. */
const FREE_CASH_KEY = "FREE_CASH";

export function AllocationPage() {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const dimension = search.dimension ?? allocationDefaults.dimension;
  const allocation = useQuery(allocationQuery());

  // `Intl.DisplayNames` for currency and country rather than the locale files,
  // for the reason Phase 4 settled: fourteen hand-translated names that could
  // drift from what the rest of the app calls the same things.
  const labelFor = (which: AllocationDimension): ((key: string) => string) => {
    if (which === "currency") {
      const names = new Intl.DisplayNames([locale], { type: "currency" });
      return (key) => names.of(key) ?? key;
    }
    if (which === "country") {
      const names = new Intl.DisplayNames([locale], { type: "region" });
      return (key) => names.of(key) ?? key;
    }

    // `by_archetype` is *not* the overview's `archetypes[]`. The overview
    // slices holdings only and types the field as `ArchetypeEnum`; this
    // endpoint adds a sixth bucket for uninvested cash and types `key` as a
    // bare string, so nothing in the generated types marks the difference —
    // the schema says it in prose ("free cash as its own FREE_CASH slice") and
    // a live read is what surfaced it. Without this branch the screen renders
    // the raw i18n key at the user.
    return (key) =>
      key === FREE_CASH_KEY
        ? t("allocation.freeCash")
        : t(`enums.archetype.${key as Archetype}`);
  };

  const slicesFor = (
    which: AllocationDimension,
  ): readonly AllocationSlice[] => {
    const data = allocation.data;
    if (!data) return [];
    if (which === "currency") return data.by_currency;
    if (which === "country") return data.by_country;
    return data.by_archetype;
  };

  const slices = slicesFor(dimension);
  const isEmpty =
    allocation.data !== undefined &&
    allocation.data.by_archetype.length === 0 &&
    allocation.data.by_currency.length === 0 &&
    allocation.data.by_country.length === 0;

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.allocation.title")}
        description={t("screens.allocation.description")}
      />

      {allocation.error ? (
        <ListError onRetry={() => void allocation.refetch()} />
      ) : allocation.isPending ? (
        <ListSkeleton />
      ) : !allocation.data ? null : isEmpty ? (
        <EmptyState
          icon={IconChartPie}
          title={t("allocation.empty.title")}
          description={t("allocation.empty.description")}
          action={
            <Button asChild variant="outline">
              <Link to={PATHS.LEDGER_NEW}>{t("ledger.record")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("allocation.valuedOn", {
                date: formatCalendarDate(
                  allocation.data.on_date as CalendarDate,
                  locale,
                ),
              })}
            </p>

            {/* Absence of a warning is not confirmation. The complete case is
                said out loud, and the incomplete one names how many holdings
                the shares below do not account for. */}
            {allocation.data.complete ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconCheck aria-hidden className="size-4" />
                {t("allocation.complete")}
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {t("allocation.incomplete", {
                  count: allocation.data.missing.length,
                })}
                <Link
                  to={PATHS.PRICING}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {t("allocation.seePricing")}
                </Link>
              </p>
            )}
          </div>

          <Tabs
            value={dimension}
            onValueChange={(next) =>
              void navigate({
                search: { dimension: next as AllocationDimension },
              })
            }
          >
            <TabsList>
              {ALLOCATION_DIMENSIONS.map((option) => (
                <TabsTrigger key={option} value={option}>
                  {t(`allocation.dimensions.${option}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Dimension
            slices={slices}
            total={allocation.data.total_value}
            labelOf={labelFor(dimension)}
          />
        </div>
      )}
    </PageContainer>
  );
}
