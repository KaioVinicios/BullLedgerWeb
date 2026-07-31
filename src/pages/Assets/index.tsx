/**
 * Operate extension of the established world — the structure-list pattern's
 * third wearer, plus the one thing only assets have: a server-side archetype
 * filter riding in the URL, so a filtered view paginates truthfully and
 * survives a reload.
 */
import { useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconArchive,
  IconChartCandle,
  IconDots,
  IconPencil,
  IconPlus,
  IconRestore,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { ArchiveConfirmDialog } from "@/components/ArchiveConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { ShowArchivedToggle } from "@/components/ShowArchivedToggle";
import { SortableColumnHeader } from "@/components/SortableColumnHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PATHS } from "@/routes/path";
import { ARCHETYPES, type Archetype } from "@/schemas/apiEnums";
import {
  archiveAsset,
  assetKeys,
  listAssets,
  unarchiveAsset,
  type Asset,
  type AssetListQuery,
} from "@/services/assets";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

const route = getRouteApi(PATHS.ASSETS);

/** Radix select values are strings; "no filter" needs its own. */
const ALL_ARCHETYPES = "all";

/** What identifies the asset in its own market, when the archetype has one. */
function identifierOf(asset: Asset): string | null {
  switch (asset.archetype) {
    case "EXCHANGE_SECURITY":
      return asset.ticker;
    case "CRYPTO":
      return asset.symbol;
    default:
      return null;
  }
}

export function AssetsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [toArchive, setToArchive] = useState<Asset | null>(null);

  const page = search.page ?? 1;
  const includeArchived = search.include_archived ?? false;

  const query: AssetListQuery = {
    page,
    include_archived: includeArchived || undefined,
    ordering: search.ordering,
    archetype: search.archetype,
  };

  const list = usePaginatedQuery({
    queryKey: assetKeys.list(query),
    queryFn: () => listAssets(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  const archive = useMutation({
    mutationFn: archiveAsset,
    onSuccess: (archived) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      toast.success(t("structure.archived", { name: archived.name }));
    },
    onError: () => toast.error(t("structure.archiveFailed")),
    onSettled: () => setToArchive(null),
  });

  const restore = useMutation({
    mutationFn: unarchiveAsset,
    onSuccess: (restored) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      toast.success(t("structure.restored", { name: restored.name }));
    },
    onError: () => toast.error(t("structure.restoreFailed")),
  });

  const setOrdering = (ordering: typeof search.ordering) =>
    void navigate({ search: (prev) => ({ ...prev, ordering, page: 1 }) });

  // The filter never touches results client-side: the server owns the
  // filtered count, which is what keeps pagination honest.
  const isFiltered = search.archetype !== undefined;

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.assets.title")}
        description={t("screens.assets.description")}
        action={
          <Button asChild>
            <Link to={PATHS.ASSETS_NEW}>
              <IconPlus aria-hidden />
              {t("assets.add")}
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="archetype-filter" className="font-normal">
              {t("assets.filter.label")}
            </Label>
            <Select
              value={search.archetype ?? ALL_ARCHETYPES}
              onValueChange={(value) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    archetype:
                      value === ALL_ARCHETYPES
                        ? undefined
                        : (value as Archetype),
                    page: 1,
                  }),
                })
              }
            >
              <SelectTrigger id="archetype-filter" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ARCHETYPES}>
                  {t("assets.filter.all")}
                </SelectItem>
                {ARCHETYPES.map((archetype) => (
                  <SelectItem key={archetype} value={archetype}>
                    {t(`enums.archetype.${archetype}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ShowArchivedToggle
            checked={includeArchived}
            onCheckedChange={(checked) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  include_archived: checked,
                  page: 1,
                }),
              })
            }
          />
        </div>

        {list.error ? (
          <ListError onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <ListSkeleton />
        ) : list.count === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={IconChartCandle}
              title={t("assets.noMatches.title")}
              description={t("assets.noMatches.description")}
              action={
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        archetype: undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  {t("assets.noMatches.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={IconChartCandle}
              title={t("assets.empty.title")}
              description={t("assets.empty.description")}
              action={
                <Button asChild variant="outline">
                  <Link to={PATHS.ASSETS_NEW}>
                    <IconPlus aria-hidden />
                    {t("assets.add")}
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableColumnHeader
                    label={t("assets.columns.name")}
                    field="name"
                    ordering={search.ordering}
                    onOrderingChange={setOrdering}
                  />
                  <TableHead>{t("assets.columns.archetype")}</TableHead>
                  <TableHead>{t("assets.columns.identifier")}</TableHead>
                  <TableHead>{t("assets.columns.currency")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("structure.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={PATHS.ASSETS_EDIT}
                          params={{ id: asset.id }}
                          className="hover:underline"
                        >
                          {asset.name}
                        </Link>
                        {asset.archived_at !== null && (
                          <Badge variant="outline">
                            {t("structure.archivedBadge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`enums.archetype.${asset.archetype}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {identifierOf(asset) ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {asset.currency}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("structure.openMenu", {
                              name: asset.name,
                            })}
                          >
                            <IconDots aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              to={PATHS.ASSETS_EDIT}
                              params={{ id: asset.id }}
                            >
                              <IconPencil aria-hidden />
                              {t("structure.edit")}
                            </Link>
                          </DropdownMenuItem>
                          {asset.archived_at === null ? (
                            <DropdownMenuItem
                              onSelect={() => setToArchive(asset)}
                            >
                              <IconArchive aria-hidden />
                              {t("structure.archive")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => restore.mutate(asset.id)}
                            >
                              <IconRestore aria-hidden />
                              {t("structure.restore")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ArchiveConfirmDialog
        name={toArchive?.name ?? ""}
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
