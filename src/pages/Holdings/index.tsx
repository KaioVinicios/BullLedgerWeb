/**
 * What you hold right now, and where it sits.
 *
 * The overview answers "how am I doing"; the ledger answers "what happened".
 * Neither answers "what do I own and where", and this does — under the level a
 * person actually thinks in, the institution, which the API has no concept of
 * in its rollup and does not need one: `Account.institution` is one join away
 * and `groupByCustody` does it here.
 *
 * **One request, and it is already in flight.** `GET /api/portfolio/overview/`
 * is unpaginated and carries every account's holding rows, so this screen adds
 * no read of its own — it re-hangs a response the overview has already cached
 * and that every ledger, pricing, and reporting-currency write invalidates
 * under `PORTFOLIO_KEY`.
 *
 * Strictly a read. No mutation hook is imported here or in anything it
 * composes.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconBriefcase, IconHistory, IconWallet } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetPivot } from "@/pages/Holdings/AssetPivot";
import { InstitutionGroup } from "@/pages/Holdings/InstitutionGroup";
import {
  HOLDINGS_GRAINS,
  HOLDINGS_PIVOTS,
  holdingsDefaults,
  type HoldingsGrain,
  type HoldingsPivot,
} from "@/schemas/portfolioView";
import { PATHS } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { institutionKeys, listInstitutions } from "@/services/institutions";
import { overviewQuery } from "@/services/portfolio";
import { groupByAsset, groupByCustody, isOpenPosition } from "@/utils/holdings";

const route = getRouteApi(PATHS.HOLDINGS);

/** Only live rows: an archived account or asset takes no new movement. */
const LIVE = {} as const;

export function HoldingsPage() {
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
  const { data: institutions } = useQuery({
    queryKey: institutionKeys.list(LIVE),
    queryFn: () => listInstitutions(LIVE),
  });

  const closed = search.closed ?? [];
  const pivot: HoldingsPivot = search.by ?? holdingsDefaults.by;
  const grain: HoldingsGrain = search.grain ?? holdingsDefaults.grain;

  /**
   * Changing the pivot clears `closed`: the ids in it name groups that do not
   * exist in the other one, so carrying them over would collapse nothing and
   * leave the address bar quietly wrong.
   */
  const changePivot = (next: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        by: next as HoldingsPivot,
        closed: undefined,
      }),
    });
  };

  const toggle = (key: string) => {
    const next = closed.includes(key)
      ? closed.filter((id) => id !== key)
      : [...closed, key];

    void navigate({
      search: (prev) => ({
        ...prev,
        // Absence *is* the resting state, so an empty set leaves the URL.
        closed: next.length > 0 ? next : undefined,
      }),
    });
  };

  const data = overview.data;

  const groups =
    data === undefined
      ? []
      : groupByCustody(
          data,
          accounts?.results ?? [],
          institutions?.results ?? [],
        );

  // Three absences, and they are three different facts about the same person.
  // Collapsing them into one message would tell someone who has closed every
  // position that they have never recorded anything.
  const rows = data?.accounts.flatMap((group) => group.holdings) ?? [];
  const hasCash = data?.accounts.some((g) => (g.cash?.amount ?? 0) !== 0);
  const emptiness =
    data === undefined
      ? null
      : data.accounts.length === 0
        ? "noAccounts"
        : rows.length === 0 && !hasCash
          ? "nothingRecorded"
          : !rows.some(isOpenPosition) && !hasCash
            ? "allClosed"
            : null;

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.holdings.title")}
        description={t("screens.holdings.description")}
      />

      {overview.error ? (
        <ListError onRetry={() => void overview.refetch()} />
      ) : overview.isPending ? (
        <ListSkeleton />
      ) : !data ? null : emptiness === "noAccounts" ? (
        <EmptyState
          icon={IconWallet}
          title={t("holdings.empty.noAccounts.title")}
          description={t("holdings.empty.noAccounts.description")}
          action={
            <Button asChild>
              <Link to={PATHS.INSTITUTIONS_NEW}>
                {t("overview.firstRun.institution.action")}
              </Link>
            </Button>
          }
        />
      ) : emptiness === "nothingRecorded" ? (
        <EmptyState
          icon={IconBriefcase}
          title={t("holdings.empty.nothingRecorded.title")}
          description={t("holdings.empty.nothingRecorded.description")}
          action={
            <Button asChild>
              <Link to={PATHS.LEDGER_NEW}>
                {t("holdings.empty.nothingRecorded.action")}
              </Link>
            </Button>
          }
        />
      ) : emptiness === "allClosed" ? (
        <EmptyState
          icon={IconHistory}
          title={t("holdings.empty.allClosed.title")}
          description={t("holdings.empty.allClosed.description")}
          action={
            <Button asChild variant="outline">
              <Link to={PATHS.LEDGER}>
                {t("holdings.empty.allClosed.action")}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={pivot} onValueChange={changePivot}>
              <TabsList aria-label={t("holdings.pivot.label")}>
                {HOLDINGS_PIVOTS.map((option) => (
                  <TabsTrigger key={option} value={option}>
                    {t(`holdings.pivot.${option}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Offered under the asset pivot only: a purchase belongs to a
                position, and the custody pivot's rows are accounts. */}
            {pivot === "asset" && (
              <Tabs
                value={grain}
                onValueChange={(next) =>
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      grain: next as HoldingsGrain,
                    }),
                  })
                }
              >
                <TabsList aria-label={t("holdings.grain.label")}>
                  {HOLDINGS_GRAINS.map((option) => (
                    <TabsTrigger key={option} value={option}>
                      {t(`holdings.grain.${option}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>

          {pivot === "asset" ? (
            <AssetPivot
              groups={groupByAsset(
                data,
                accounts?.results ?? [],
                assets?.results ?? [],
                institutions?.results ?? [],
              )}
              closed={closed}
              onToggle={toggle}
              grain={grain}
              missing={data.missing}
            />
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <InstitutionGroup
                  key={group.key}
                  group={group}
                  isOpen={!closed.includes(group.key)}
                  onToggle={() => toggle(group.key)}
                  closedAccounts={closed}
                  onToggleAccount={toggle}
                  assets={assets?.results ?? []}
                  missing={data.missing}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
