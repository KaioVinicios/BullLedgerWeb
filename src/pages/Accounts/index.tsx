/**
 * Operate extension of the established world — the institutions list's
 * pattern, re-worn by accounts: URL-driven page/archived/ordering state,
 * text-marked archived rows, and the one gold action. The registration
 * column speaks the product's vocabulary (TFSA, PGBL), because that is the
 * name the user knows their account by.
 */
import { useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconArchive,
  IconDots,
  IconPencil,
  IconPlus,
  IconRestore,
  IconScale,
  IconWallet,
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
import { PATHS } from "@/routes/path";
import {
  archiveAccount,
  accountKeys,
  listAccounts,
  unarchiveAccount,
  type Account,
  type AccountListQuery,
} from "@/services/accounts";
import { institutionKeys, listInstitutions } from "@/services/institutions";
import { PORTFOLIO_KEY } from "@/services/queryKeys";
import { accountLabel } from "@/utils/accountLabel";

const route = getRouteApi(PATHS.ACCOUNTS);

export function AccountsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [toArchive, setToArchive] = useState<Account | null>(null);

  const page = search.page ?? 1;
  const includeArchived = search.include_archived ?? false;

  const query: AccountListQuery = {
    page,
    include_archived: includeArchived || undefined,
    ordering: search.ordering,
  };

  const list = usePaginatedQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => listAccounts(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  // One extra read to label rows with their institution's name and mark —
  // archived ones included, because an account keeps pointing at an
  // institution the user has tidied away.
  const institutionsQuery = { include_archived: true as const };
  const { data: institutionsPage } = useQuery({
    queryKey: institutionKeys.list(institutionsQuery),
    queryFn: () => listInstitutions(institutionsQuery),
  });

  // The whole record rather than its name: the cell renders the logo beside
  // the name, and a second map keyed the same way would be one join to keep
  // in sync for nothing.
  const institutionsById = useMemo(
    () =>
      new Map((institutionsPage?.results ?? []).map((row) => [row.id, row])),
    [institutionsPage],
  );

  // The design rule from services/queryKeys.ts: archival changes what the
  // projections aggregate, so PORTFOLIO_KEY goes wholesale alongside the
  // resource's own root.
  const archive = useMutation({
    mutationFn: archiveAccount,
    onSuccess: (archived) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      toast.success(t("structure.archived", { name: archived.name }));
    },
    onError: () => toast.error(t("structure.archiveFailed")),
    onSettled: () => setToArchive(null),
  });

  const restore = useMutation({
    mutationFn: unarchiveAccount,
    onSuccess: (restored) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      toast.success(t("structure.restored", { name: restored.name }));
    },
    onError: () => toast.error(t("structure.restoreFailed")),
  });

  const setOrdering = (ordering: typeof search.ordering) =>
    void navigate({ search: (prev) => ({ ...prev, ordering, page: 1 }) });

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.accounts.title")}
        description={t("screens.accounts.description")}
        action={
          <div className="flex flex-wrap gap-2">
            {/* Reference data for the registrations this list assigns, so it
                sits beside them rather than in primary navigation. */}
            <Button asChild variant="outline">
              <Link to={PATHS.ACCOUNTS_LIMITS}>
                <IconScale aria-hidden />
                {t("accounts.seeLimits")}
              </Link>
            </Button>
            <Button asChild>
              <Link to={PATHS.ACCOUNTS_NEW}>
                <IconPlus aria-hidden />
                {t("accounts.add")}
              </Link>
            </Button>
          </div>
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
            icon={IconWallet}
            title={t("accounts.empty.title")}
            description={t("accounts.empty.description")}
            action={
              <Button asChild variant="outline">
                <Link to={PATHS.ACCOUNTS_NEW}>
                  <IconPlus aria-hidden />
                  {t("accounts.add")}
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
                    label={t("accounts.columns.name")}
                    field="name"
                    ordering={search.ordering}
                    onOrderingChange={setOrdering}
                  />
                  <TableHead>{t("accounts.columns.institution")}</TableHead>
                  <TableHead>{t("accounts.columns.registration")}</TableHead>
                  <TableHead>{t("accounts.columns.currency")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("structure.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((account) => {
                  // Resolved once per row: the cell needs the record, not just
                  // its name, and `undefined` here means the join missed — a
                  // different fact from an account that has no institution.
                  const institution = account.institution
                    ? institutionsById.get(account.institution)
                    : undefined;

                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={PATHS.ACCOUNTS_EDIT}
                            params={{ id: account.id }}
                            className="hover:underline"
                          >
                            {accountLabel(account, t, {
                              withRegistration: false,
                            })}
                          </Link>
                          {account.archived_at !== null && (
                            <Badge variant="outline">
                              {t("structure.archivedBadge")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {institution ? (
                          <span className="flex items-center gap-2">
                            <InstitutionLogo
                              name={institution.name}
                              logo={institution.logo}
                              size="sm"
                            />
                            {institution.name}
                          </span>
                        ) : account.institution ? (
                          "—"
                        ) : (
                          t("accounts.noInstitution")
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {t(`enums.registration.${account.registration}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {account.base_currency}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("structure.openMenu", {
                                name: accountLabel(account, t, {
                                  withRegistration: false,
                                }),
                              })}
                            >
                              <IconDots aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to={PATHS.ACCOUNTS_EDIT}
                                params={{ id: account.id }}
                              >
                                <IconPencil aria-hidden />
                                {t("structure.edit")}
                              </Link>
                            </DropdownMenuItem>
                            {account.archived_at === null ? (
                              <DropdownMenuItem
                                onSelect={() => setToArchive(account)}
                              >
                                <IconArchive aria-hidden />
                                {t("structure.archive")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onSelect={() => restore.mutate(account.id)}
                              >
                                <IconRestore aria-hidden />
                                {t("structure.restore")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
