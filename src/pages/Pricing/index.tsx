/**
 * Every price the user has recorded, newest first.
 *
 * It wears the ledger list's pattern — URL-driven state, the loading / empty /
 * error triad, `usePaginatedQuery` — with one addition and one deliberate
 * absence.
 *
 * The addition is coverage: the block above the table names the holdings the
 * server could not value, so a missing price is something the screen says out
 * loud rather than something the user infers from a figure that never appears.
 *
 * The absence is sorting. `GET /api/price-quotes/` declares no `ordering`
 * parameter, so a sortable header would be a control that cannot work — the
 * same reason the ledger ships none.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconClockExclamation,
  IconPlus,
  IconTag,
  IconWorld,
} from "@tabler/icons-react";

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
import { Coverage } from "@/pages/Pricing/Coverage";
import { PATHS } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets, type Asset } from "@/services/assets";
import { overviewQuery } from "@/services/portfolio";
import {
  listPriceQuotes,
  priceQuoteKeys,
  type PriceQuote,
  type PriceQuoteListQuery,
} from "@/services/pricing";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";

const route = getRouteApi(PATHS.PRICING);

/** Radix select values are strings; "no filter" needs one of its own. */
const ALL = "all";

/** Only live rows are worth listing; an archived asset takes no new quote. */
const LIVE = {} as const;

export function PricingPage() {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const page = search.page ?? 1;
  const query: PriceQuoteListQuery = { page, asset: search.asset };

  const list = usePaginatedQuery({
    queryKey: priceQuoteKeys.list(query),
    queryFn: () => listPriceQuotes(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  // Rows name their asset by id; these two reads turn those back into names,
  // fill the filter select, and give each row its currency.
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });
  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });

  const overview = useQuery(overviewQuery());

  const assetById = (id: string): Asset | undefined =>
    assets?.results.find((row) => row.id === id);

  const setAsset = (asset: string | undefined) =>
    void navigate({ search: (prev) => ({ ...prev, asset, page: 1 }) });

  // Only meaningful filtered to one asset. Unfiltered, the newest row is the
  // newest across the whole portfolio and says nothing about any one asset —
  // so the line is absent rather than misleading.
  const latest = search.asset ? list.rows[0] : undefined;
  const valuedOn = overview.data?.on_date;
  const precedesValuation =
    latest !== undefined && valuedOn !== undefined && latest.date < valuedOn;

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.pricing.title")}
        description={t("screens.pricing.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={PATHS.PRICING_FX}>
                <IconWorld aria-hidden />
                {t("pricing.fxRates")}
              </Link>
            </Button>
            <Button asChild>
              <Link to={PATHS.PRICING_NEW}>
                <IconPlus aria-hidden />
                {t("pricing.recordQuote")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Coverage
          overview={overview.data}
          isPending={overview.isPending}
          error={overview.error}
          onRetry={() => void overview.refetch()}
          assets={assets?.results ?? []}
          accounts={accounts?.results ?? []}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricing-asset" className="font-normal">
                {t("pricing.filters.asset")}
              </Label>
              <Select
                value={search.asset ?? ALL}
                onValueChange={(next) =>
                  setAsset(next === ALL ? undefined : next)
                }
              >
                <SelectTrigger id="pricing-asset" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t("pricing.filters.all")}
                  </SelectItem>
                  {(assets?.results ?? []).map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* A dated fact, never a verdict. The server reports absence, not
              age, so this states the two dates and lets the reader judge —
              and the marker is a word plus an icon, never a shade. */}
          {latest && valuedOn && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("pricing.age.lastQuote", {
                date: formatCalendarDate(latest.date as CalendarDate, locale),
              })}
              {" · "}
              {t("pricing.age.valuedOn", {
                date: formatCalendarDate(valuedOn as CalendarDate, locale),
              })}
              {precedesValuation && (
                <span className="ml-2 inline-flex items-center gap-1 font-medium text-foreground">
                  <IconClockExclamation aria-hidden className="size-3.5" />
                  {t("pricing.age.precedesValuation")}
                </span>
              )}
            </p>
          )}

          {list.error ? (
            <ListError onRetry={() => void list.refetch()} />
          ) : list.isPending ? (
            <ListSkeleton />
          ) : list.count === 0 ? (
            <EmptyState
              icon={IconTag}
              title={t(
                search.asset
                  ? "pricing.empty.filteredTitle"
                  : "pricing.empty.title",
              )}
              description={t(
                search.asset
                  ? "pricing.empty.filteredDescription"
                  : "pricing.empty.description",
              )}
              action={
                <Button asChild variant="outline">
                  <Link
                    to={PATHS.PRICING_NEW}
                    search={search.asset ? { asset: search.asset } : {}}
                  >
                    <IconPlus aria-hidden />
                    {t("pricing.recordQuote")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pricing.columns.date")}</TableHead>
                    <TableHead>{t("pricing.columns.asset")}</TableHead>
                    <TableHead className="text-right">
                      {t("pricing.columns.price")}
                    </TableHead>
                    <TableHead>{t("pricing.columns.source")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.rows.map((quote) => (
                    <QuoteRow
                      key={quote.id}
                      quote={quote}
                      asset={assetById(quote.asset)}
                      locale={locale}
                    />
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
      </div>
    </PageContainer>
  );
}

function QuoteRow({
  quote,
  asset,
  locale,
}: {
  quote: PriceQuote;
  asset: Asset | undefined;
  locale: string;
}) {
  const { t } = useTranslation("app");

  return (
    <TableRow>
      <TableCell className="font-mono text-sm whitespace-nowrap">
        {formatCalendarDate(quote.date as CalendarDate, locale)}
      </TableCell>
      <TableCell>{asset?.name ?? "—"}</TableCell>
      {/* A price is not Money: the decimal string as recorded, at the schema's
          own scale, with the asset's native currency beside it rather than a
          symbol in front of it. */}
      <TableCell className="text-right font-mono text-sm tabular-nums">
        {formatDecimal(quote.price, locale, SCALE.unitPrice)}{" "}
        <span className="text-muted-foreground">{asset?.currency}</span>
      </TableCell>
      <TableCell>
        <Badge
          variant={quote.price_source === "MANUAL" ? "secondary" : "outline"}
        >
          {t(`enums.priceSource.${quote.price_source}`)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
