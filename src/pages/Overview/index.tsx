/**
 * What the user opened the app for.
 *
 * One request answers the whole screen: `GET /api/portfolio/overview/` carries
 * the total, free cash, both returns, the by-account groups *with their holding
 * rows*, the by-archetype slices, and `missing[]`. It is also not paginated —
 * the whole portfolio arrives at once, which is what makes the grouped
 * presentation honest rather than a view over one page of many.
 *
 * Strictly a read. No mutation hook is imported here or in anything this
 * composes.
 *
 * The projections carry bare UUIDs, so accounts and assets are joined from
 * their own caches to give every row a name.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";

import {
  AllocationBar,
  type AllocationSegment,
} from "@/components/AllocationBar";
import { ListError } from "@/components/ListError";
import { ListSkeleton } from "@/components/ListSkeleton";
import { MoneyValue } from "@/components/MoneyValue";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PercentValue } from "@/components/PercentValue";
import { AccountGroupBlock } from "@/pages/Overview/AccountGroup";
import { FirstRun } from "@/pages/Overview/FirstRun";
import { Totals } from "@/pages/Overview/Totals";
import { APP_INDEX_ROUTE_ID, PATHS } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { overviewQuery } from "@/services/portfolio";
import { isOpenPosition } from "@/utils/holdings";

// The index route's own id, not the layout's — see `APP_INDEX_ROUTE_ID`.
const route = getRouteApi(APP_INDEX_ROUTE_ID);

/** Only live rows: an archived account or asset takes no new movement. */
const LIVE = {} as const;

export function OverviewPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const overview = useQuery(overviewQuery());

  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  const closed = search.closed ?? [];

  const toggle = (accountId: string) => {
    const next = closed.includes(accountId)
      ? closed.filter((id) => id !== accountId)
      : [...closed, accountId];

    void navigate({
      search: (prev) => ({
        ...prev,
        // Absence *is* the resting state, so an empty set leaves the URL.
        closed: next.length > 0 ? next : undefined,
      }),
    });
  };

  const nameOf = (id: string) =>
    accounts?.results.find((row) => row.id === id)?.name ?? "—";

  const data = overview.data;

  // A portfolio with nothing in it yet. Every group being empty covers both
  // shapes the API might send — no accounts at all, or accounts that exist but
  // hold nothing — so the first-run path does not depend on which one it is.
  //
  // Counted after the open-position filter, not before: the payload keeps a row
  // for every asset an account has ever touched, so a portfolio whose every
  // position has been closed arrives with holdings and holds nothing. Counting
  // the raw rows would render it as an occupied screen with no rows on it.
  const isEmpty =
    data !== undefined &&
    data.accounts.every(
      (group) =>
        group.holdings.filter(isOpenPosition).length === 0 &&
        (group.cash?.amount ?? 0) === 0,
    );

  const archetypeSegments: AllocationSegment[] = (data?.archetypes ?? []).map(
    (slice) => ({
      id: slice.archetype,
      label: t(`enums.archetype.${slice.archetype}`),
      value: slice.value,
      weight: slice.weight,
      complete: slice.complete,
    }),
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.overview.title")}
        description={t("screens.overview.description")}
      />

      {overview.error ? (
        <ListError onRetry={() => void overview.refetch()} />
      ) : overview.isPending ? (
        <ListSkeleton />
      ) : !data ? null : isEmpty ? (
        <FirstRun />
      ) : (
        <div className="space-y-10">
          <Totals overview={data} />

          <div className="space-y-4">
            {data.accounts.map((group) => (
              <AccountGroupBlock
                key={group.account}
                group={group}
                name={nameOf(group.account)}
                isOpen={!closed.includes(group.account)}
                onToggle={() => toggle(group.account)}
                assets={assets?.results ?? []}
                missing={data.missing}
              />
            ))}
          </div>

          {archetypeSegments.length > 0 && (
            <section
              aria-labelledby="overview-archetypes"
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="overview-archetypes" className="text-sm font-medium">
                  {t("overview.byArchetype")}
                </h2>
                {/* Currency and country live on their own screen rather than
                    being repeated here — `by_archetype` is the only dimension
                    this response already carries. */}
                <Link
                  to={PATHS.ALLOCATION}
                  className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                >
                  {t("overview.seeAllocation")}
                  <IconArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>

              <AllocationBar segments={archetypeSegments} />

              <ul className="space-y-1 text-sm">
                {archetypeSegments.map((segment) => (
                  <li
                    key={segment.id}
                    className="flex flex-wrap items-baseline justify-between gap-3"
                  >
                    <span>{segment.label}</span>
                    <span className="flex items-baseline gap-3">
                      <MoneyValue value={segment.value} />
                      {segment.weight === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <PercentValue
                          value={segment.weight}
                          className="text-muted-foreground"
                        />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}
