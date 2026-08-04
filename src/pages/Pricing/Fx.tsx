/**
 * The FX table the whole portfolio is converted through, read-only.
 *
 * Read-only is the schema's decision, not a scope cut. The table is **global
 * to the API** — everyone reads it, only staff writes it — so
 * `POST /api/fx-rates/` answers 403 to an ordinary user, and the schema
 * exposes no `is_staff` for the client to check first. A form here would be a
 * control that cannot work, which is the same reason the ledger ships no
 * sortable header.
 *
 * What the user does have is the per-movement override, and the copy points at
 * it: a rate entered on a movement always wins, is recorded verbatim, and is
 * never resolved again.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconWorld } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PATHS } from "@/routes/path";
import { CURRENCIES, type Currency } from "@/schemas/apiEnums";
import {
  fxRateKeys,
  listFxRates,
  type FxRateListQuery,
} from "@/services/pricing";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";

const route = getRouteApi(PATHS.PRICING_FX);

/** Radix select values are strings; "no filter" needs one of its own. */
const ALL = "all";

export function PricingFxPage() {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const page = search.page ?? 1;
  const query: FxRateListQuery = {
    page,
    base: search.base,
    quote: search.quote,
  };

  const list = usePaginatedQuery({
    queryKey: fxRateKeys.list(query),
    queryFn: () => listFxRates(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  const setFilter = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next, page: 1 }) });

  const isFiltered = search.base !== undefined || search.quote !== undefined;

  return (
    <PageContainer>
      <PageHeader
        title={t("pricing.fx.title")}
        description={t("pricing.fx.description")}
        action={
          <Button asChild variant="outline">
            <Link to={PATHS.PRICING}>
              <IconArrowLeft aria-hidden />
              {t("pricing.backToPrices")}
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="space-y-2 rounded-xl bg-muted/50 p-4">
          <p className="text-sm">{t("pricing.fx.precedence")}</p>
          <p className="text-sm text-muted-foreground">
            {t("pricing.fx.movementOverride")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("pricing.fx.readOnly")}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <CurrencyFilter
            id="fx-base"
            label={t("pricing.filters.base")}
            allLabel={t("pricing.filters.all")}
            value={search.base}
            onChange={(base) => setFilter({ base })}
          />
          <CurrencyFilter
            id="fx-quote"
            label={t("pricing.filters.quote")}
            allLabel={t("pricing.filters.all")}
            value={search.quote}
            onChange={(quote) => setFilter({ quote })}
          />
        </div>

        {list.error ? (
          <ListError onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <ListSkeleton />
        ) : list.count === 0 ? (
          // An empty table and an empty filter are different situations, and
          // the live walk found the screen conflating them: with no filter set
          // it still said "clear the filters". A globally empty table means
          // the platform's sync has not published, which is worth saying
          // rather than blaming on a filter nobody applied.
          <EmptyState
            icon={IconWorld}
            title={t(
              isFiltered
                ? "pricing.fx.empty.title"
                : "pricing.fx.empty.unfilteredTitle",
            )}
            description={t(
              isFiltered
                ? "pricing.fx.empty.description"
                : "pricing.fx.empty.unfilteredDescription",
            )}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pricing.columns.date")}</TableHead>
                  <TableHead>{t("pricing.columns.pair")}</TableHead>
                  <TableHead className="text-right">
                    {t("pricing.columns.rate")}
                  </TableHead>
                  <TableHead>{t("pricing.columns.source")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {formatCalendarDate(rate.date as CalendarDate, locale)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rate.base}/{rate.quote}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatDecimal(rate.rate, locale, SCALE.rate)}
                    </TableCell>
                    <TableCell>
                      {/* MANUAL means override, and the word is what says so —
                          a badge that only changed shade would leave the
                          precedence rule invisible. */}
                      <Badge
                        variant={
                          rate.source === "MANUAL" ? "secondary" : "outline"
                        }
                      >
                        {t(`enums.priceSource.${rate.source}`)}
                      </Badge>
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

function CurrencyFilter({
  id,
  label,
  allLabel,
  value,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: Currency | undefined;
  onChange: (value: Currency | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) =>
          onChange(next === ALL ? undefined : (next as Currency))
        }
      >
        <SelectTrigger id={id} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
