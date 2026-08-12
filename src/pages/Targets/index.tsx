/**
 * Every target the user owns, in three sections ordered most specific first.
 *
 * The order is the point. `business-rules.md` resolves a holding's effective
 * target across three levels and takes the first match as a **whole package,
 * never a blend** — so the screen puts the levels in that order, names the
 * rule above them, and numbers them.
 *
 * **One load, not four.** Every target is fetched once and the sections slice
 * it locally. That is not an optimisation — it is what the shadow note needs:
 * deciding whether a portfolio default is covered means comparing it against
 * levels the reader is not looking at, and a page-1 answer would miss a
 * shadower the same way it used to miss an asset name. Loading assets and
 * accounts whole is the same fix for the same defect: `targetScopeName` fell
 * back to a UUID for anything past the first fifty. The URL page parameters
 * are unchanged; only where the page comes from changed.
 */
import { useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconPlus, IconTarget } from "@tabler/icons-react";
import { toast } from "sonner";

import { ArchiveConfirmDialog } from "@/components/ArchiveConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { ShowArchivedToggle } from "@/components/ShowArchivedToggle";
import { Button } from "@/components/ui/button";
import { ResolutionExplainer } from "@/pages/Targets/ResolutionExplainer";
import { ScopeSection } from "@/pages/Targets/ScopeSection";
import { PATHS } from "@/routes/path";
import { TARGET_SCOPES, type TargetScope } from "@/schemas/apiEnums";
import { PAGE_PARAM } from "@/schemas/targetsList";
import { allAccountsQuery } from "@/services/accounts";
import { allAssetsQuery } from "@/services/assets";
import {
  archiveTarget,
  invalidateTargets,
  targetsInScopeQuery,
  unarchiveTarget,
  type Target,
} from "@/services/targets";
import { findShadowers } from "@/utils/targetShadow";
import { targetScopeName } from "@/utils/targetScope";

const route = getRouteApi(PATHS.TARGETS);

export function TargetsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [toArchive, setToArchive] = useState<Target | null>(null);

  const includeArchived = search.include_archived ?? false;

  const [
    holdingTargets,
    accountTargets,
    portfolioTargets,
    assetList,
    accountList,
  ] = useQueries({
    queries: [
      targetsInScopeQuery("HOLDING", includeArchived),
      targetsInScopeQuery("ACCOUNT_ARCHETYPE", includeArchived),
      targetsInScopeQuery("PORTFOLIO_ARCHETYPE", includeArchived),
      allAssetsQuery,
      allAccountsQuery,
    ],
  });

  const byScope: Record<TargetScope, Target[]> = useMemo(
    () => ({
      HOLDING: holdingTargets.data ?? [],
      ACCOUNT_ARCHETYPE: accountTargets.data ?? [],
      PORTFOLIO_ARCHETYPE: portfolioTargets.data ?? [],
    }),
    [holdingTargets.data, accountTargets.data, portfolioTargets.data],
  );

  const everyTarget = useMemo(
    () => TARGET_SCOPES.flatMap((scope) => byScope[scope]),
    [byScope],
  );

  const assets = useMemo(() => assetList.data ?? [], [assetList.data]);
  const accounts = useMemo(() => accountList.data ?? [], [accountList.data]);

  const names = useMemo(
    () => ({
      accountName: (id: string) =>
        accounts.find((row) => row.id === id)?.name ?? id,
      assetName: (id: string) =>
        assets.find((row) => row.id === id)?.name ?? id,
    }),
    [accounts, assets],
  );

  const archetypeOf = useMemo(() => {
    const index = new Map(assets.map((row) => [row.id, row.archetype]));

    return (assetId: string) => index.get(assetId);
  }, [assets]);

  const shadowersOf = useMemo(
    () => (target: Target) => findShadowers(target, everyTarget, archetypeOf),
    [everyTarget, archetypeOf],
  );

  const queries = [
    holdingTargets,
    accountTargets,
    portfolioTargets,
    assetList,
    accountList,
  ];
  const isPending = queries.some((query) => query.isPending);
  const error = queries.find((query) => query.error)?.error;
  const isEmpty = !isPending && everyTarget.length === 0;

  /**
   * `null` while the load is in flight, so the explainer says "—" rather than
   * claiming three empty levels for a frame. A level with no targets is a fact
   * the screen knows; a level not loaded yet is not.
   */
  const counts: Record<TargetScope, number | null> = {
    HOLDING: isPending ? null : byScope.HOLDING.length,
    ACCOUNT_ARCHETYPE: isPending ? null : byScope.ACCOUNT_ARCHETYPE.length,
    PORTFOLIO_ARCHETYPE: isPending ? null : byScope.PORTFOLIO_ARCHETYPE.length,
  };

  const archive = useMutation({
    mutationFn: archiveTarget,
    onSuccess: async () => {
      await invalidateTargets(queryClient);
      toast.success(t("targets.archived"));
    },
    onError: () => toast.error(t("structure.archiveFailed")),
    onSettled: () => setToArchive(null),
  });

  const restore = useMutation({
    mutationFn: unarchiveTarget,
    onSuccess: async () => {
      await invalidateTargets(queryClient);
      toast.success(t("targets.restored"));
    },
    onError: () => toast.error(t("structure.restoreFailed")),
  });

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.targets.title")}
        description={t("screens.targets.description")}
        action={
          <Button asChild>
            <Link to={PATHS.TARGETS_NEW}>
              <IconPlus aria-hidden />
              {t("targets.add")}
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <ResolutionExplainer counts={counts} />

        <div className="flex justify-end">
          <ShowArchivedToggle
            checked={includeArchived}
            onCheckedChange={(checked) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  include_archived: checked,
                  holdingPage: 1,
                  accountPage: 1,
                  portfolioPage: 1,
                }),
              })
            }
          />
        </div>

        {error ? (
          <ListError
            onRetry={() => {
              for (const query of queries) void query.refetch();
            }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={IconTarget}
            title={t("targets.empty.title")}
            description={t("targets.empty.description")}
            action={
              <Button asChild variant="outline">
                <Link to={PATHS.TARGETS_NEW}>
                  <IconPlus aria-hidden />
                  {t("targets.empty.action")}
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            {TARGET_SCOPES.map((scope) => {
              const param = PAGE_PARAM[scope];

              return (
                <ScopeSection
                  key={scope}
                  scope={scope}
                  rows={byScope[scope]}
                  page={search[param] ?? 1}
                  onPageChange={(next) =>
                    void navigate({
                      search: (prev) => ({ ...prev, [param]: next }),
                    })
                  }
                  isPending={isPending}
                  names={names}
                  shadowersOf={shadowersOf}
                  onArchive={setToArchive}
                  onRestore={(target) => restore.mutate(target.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <ArchiveConfirmDialog
        name={toArchive ? targetScopeName(toArchive, names, t) : ""}
        open={toArchive !== null}
        onOpenChange={(open) => {
          if (!open) setToArchive(null);
        }}
        onConfirm={() => {
          if (toArchive) archive.mutate(toArchive.id);
        }}
        isPending={archive.isPending}
      />
    </PageContainer>
  );
}
