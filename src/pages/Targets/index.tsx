/**
 * Every target the user owns, in three sections ordered most specific first.
 *
 * The order is the point. `business-rules.md` resolves a holding's effective
 * target across three levels and takes the first match as a **whole package,
 * never a blend** — so the screen puts the levels in that order and says so
 * above them. A single table with a scope column would have been one query and
 * one pagination, and would have left the rule entirely to a sentence.
 *
 * A section with no rows keeps its heading and says it is empty, because the
 * three headings are what carry the lesson; the full empty state appears only
 * when every level is empty.
 */
import { useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconPlus, IconTarget } from "@tabler/icons-react";
import { toast } from "sonner";

import { ArchiveConfirmDialog } from "@/components/ArchiveConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { ShowArchivedToggle } from "@/components/ShowArchivedToggle";
import { Button } from "@/components/ui/button";
import { ScopeSection } from "@/pages/Targets/ScopeSection";
import { PATHS } from "@/routes/path";
import { TARGET_SCOPES } from "@/schemas/apiEnums";
import { PAGE_PARAM } from "@/schemas/targetsList";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import {
  archiveTarget,
  invalidateTargets,
  listTargets,
  targetKeys,
  unarchiveTarget,
  type Target,
} from "@/services/targets";
import { targetScopeName } from "@/utils/targetScope";

const route = getRouteApi(PATHS.TARGETS);

const LIVE = {} as const;

export function TargetsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [toArchive, setToArchive] = useState<Target | null>(null);

  const includeArchived = search.include_archived ?? false;

  const { data: accountsPage } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assetsPage } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  const names = useMemo(() => {
    const accounts = accountsPage?.results ?? [];
    const assets = assetsPage?.results ?? [];

    return {
      accountName: (id: string) =>
        accounts.find((row) => row.id === id)?.name ?? id,
      assetName: (id: string) =>
        assets.find((row) => row.id === id)?.name ?? id,
    };
  }, [accountsPage, assetsPage]);

  /**
   * Whether the whole screen is empty, asked once rather than inferred from
   * three sections that each answer only for themselves.
   */
  const totalsQuery = {
    include_archived: includeArchived || undefined,
  };
  const totals = useQuery({
    queryKey: targetKeys.list(totalsQuery),
    queryFn: () => listTargets(totalsQuery),
  });
  const isEmpty = totals.data?.count === 0;

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            {t("targets.resolution")}
          </p>
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

        {isEmpty ? (
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
                  page={search[param] ?? 1}
                  onPageChange={(next) =>
                    void navigate({
                      search: (prev) => ({ ...prev, [param]: next }),
                    })
                  }
                  includeArchived={includeArchived}
                  names={names}
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
