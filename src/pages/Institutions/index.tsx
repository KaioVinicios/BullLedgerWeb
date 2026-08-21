/**
 * THESIS: the ledger's cast of institutions, scannable at a glance — rows of
 * names the user already knows, not a dashboard asking for attention.
 * OWN-WORLD: the incumbent shell vocabulary — shadcn table, secondary badges,
 * gold spent only on the one primary action. STORY: see what holds your money,
 * add what's missing, tidy what's over. FIRST VIEWPORT: header with "Add
 * institution", the table right under it, archived rows an explicit ask away.
 * FORM: Operate extension of the established world; no new identity.
 */
import { useMemo, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconBuildingBank,
  IconDots,
  IconPencil,
  IconPlus,
  IconRestore,
  IconArchive,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { ArchiveConfirmDialog } from "@/components/ArchiveConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { InstitutionLogo } from "@/components/InstitutionLogo";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { Link } from "@tanstack/react-router";
import { PATHS } from "@/routes/path";
import {
  archiveInstitution,
  institutionKeys,
  listInstitutions,
  unarchiveInstitution,
  type Institution,
  type InstitutionListQuery,
} from "@/services/institutions";

const route = getRouteApi(PATHS.INSTITUTIONS);

export function InstitutionsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  // Scoped to this route, so a search updater's `prev` is this screen's own
  // validated shape rather than the union of every route's search params.
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [toArchive, setToArchive] = useState<Institution | null>(null);

  const regionNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: "region" }),
    [locale],
  );

  // Absence *is* the default: the URL only says what differs from rest.
  const page = search.page ?? 1;
  const includeArchived = search.include_archived ?? false;

  // `false` stays out of the request the way it stays out of the URL: absent.
  const query: InstitutionListQuery = {
    page,
    include_archived: includeArchived || undefined,
    ordering: search.ordering,
  };

  const list = usePaginatedQuery({
    queryKey: institutionKeys.list(query),
    queryFn: () => listInstitutions(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  const archive = useMutation({
    mutationFn: archiveInstitution,
    onSuccess: (archived) => {
      void queryClient.invalidateQueries({ queryKey: institutionKeys.all });
      toast.success(t("structure.archived", { name: archived.name }));
    },
    onError: () => toast.error(t("structure.archiveFailed")),
    onSettled: () => setToArchive(null),
  });

  const restore = useMutation({
    mutationFn: unarchiveInstitution,
    onSuccess: (restored) => {
      void queryClient.invalidateQueries({ queryKey: institutionKeys.all });
      toast.success(t("structure.restored", { name: restored.name }));
    },
    onError: () => toast.error(t("structure.restoreFailed")),
  });

  const setOrdering = (ordering: typeof search.ordering) =>
    void navigate({ search: (prev) => ({ ...prev, ordering, page: 1 }) });

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.institutions.title")}
        description={t("screens.institutions.description")}
        action={
          <Button asChild>
            <Link to={PATHS.INSTITUTIONS_NEW}>
              <IconPlus aria-hidden />
              {t("institutions.add")}
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
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

        {list.error ? (
          <ListError onRetry={() => void list.refetch()} />
        ) : list.isPending ? (
          <ListSkeleton />
        ) : list.count === 0 ? (
          <EmptyState
            icon={IconBuildingBank}
            title={t("institutions.empty.title")}
            description={t("institutions.empty.description")}
            action={
              <Button asChild variant="outline">
                <Link to={PATHS.INSTITUTIONS_NEW}>
                  <IconPlus aria-hidden />
                  {t("institutions.add")}
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="content-surface overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableColumnHeader
                    label={t("institutions.columns.name")}
                    field="name"
                    ordering={search.ordering}
                    onOrderingChange={setOrdering}
                  />
                  <TableHead>{t("institutions.columns.kinds")}</TableHead>
                  <TableHead>{t("institutions.columns.country")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("structure.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((institution) => (
                  <TableRow key={institution.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <InstitutionLogo
                          name={institution.name}
                          logo={institution.logo}
                        />
                        <Link
                          to={PATHS.INSTITUTIONS_EDIT}
                          params={{ id: institution.id }}
                          className="hover:underline"
                        >
                          {institution.name}
                        </Link>
                        {institution.archived_at !== null && (
                          <Badge variant="outline">
                            {t("structure.archivedBadge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {institution.kinds.map((kind) => (
                          <Badge key={kind} variant="secondary">
                            {t(`enums.kind.${kind}`)}
                          </Badge>
                        ))}
                        {institution.is_self_custody && (
                          <Badge variant="secondary">
                            {t("enums.selfCustody")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{regionNames.of(institution.country)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("structure.openMenu", {
                              name: institution.name,
                            })}
                          >
                            <IconDots aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              to={PATHS.INSTITUTIONS_EDIT}
                              params={{ id: institution.id }}
                            >
                              <IconPencil aria-hidden />
                              {t("structure.edit")}
                            </Link>
                          </DropdownMenuItem>
                          {institution.archived_at === null ? (
                            <DropdownMenuItem
                              onSelect={() => setToArchive(institution)}
                            >
                              <IconArchive aria-hidden />
                              {t("structure.archive")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => restore.mutate(institution.id)}
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
