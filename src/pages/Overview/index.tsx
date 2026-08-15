/**
 * What the user opened the app for.
 *
 * One request answers the whole screen: `GET /api/portfolio/overview/` carries
 * the total, free cash, both returns, the by-account groups *with their holding
 * rows*, the by-archetype slices, and `missing[]`. It is also not paginated —
 * the whole portfolio arrives at once, which is what makes the grouped
 * presentation honest rather than a view over one page of many.
 *
 * The screen is scoped by a tab strip: General, then one tab per account. The
 * open tab is the URL's `account`, and absence is General — the resting state
 * writes nothing to the address bar, the same idiom the `closed` field this
 * replaced used. The groups moved into those tabs because `/app/holdings`
 * already owns "what do I own and where", and because a tab shows one account
 * where the old list showed every one at once.
 *
 * Strictly a read. No mutation hook is imported here or in anything this
 * composes.
 *
 * The projections carry bare UUIDs, so accounts and assets are joined from
 * their own caches to give every row a name.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ListError } from "@/components/ListError";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { FirstRun } from "@/pages/Overview/FirstRun";
import { ScopeContent } from "@/pages/Overview/ScopeContent";
import { ScopeTabs } from "@/pages/Overview/ScopeTabs";
import { APP_INDEX_ROUTE_ID } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { overviewQuery } from "@/services/portfolio";
import { accountLabel } from "@/utils/accountLabel";
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

  const rows = accounts?.results ?? [];

  // A stale bookmark names an account that no longer exists; the schema's
  // `.catch` handles a malformed id, and this handles a well-formed absent one.
  const selected = rows.find((row) => row.id === search.account);
  const accountId = selected?.id;

  const selectScope = (next: string | undefined) => {
    void navigate({ search: () => (next ? { account: next } : {}) });
  };

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
        <div className="space-y-8">
          <ScopeTabs
            accountId={accountId}
            accounts={rows}
            onChange={selectScope}
          />
          <ScopeContent
            accountId={accountId}
            overview={data}
            assets={assets?.results ?? []}
            accountName={selected ? accountLabel(selected, t) : "—"}
          />
        </div>
      )}
    </PageContainer>
  );
}
