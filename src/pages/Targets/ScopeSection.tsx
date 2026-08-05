import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconArchive,
  IconDots,
  IconPencil,
  IconRestore,
} from "@tabler/icons-react";

import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
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
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { PATHS } from "@/routes/path";
import type { TargetScope } from "@/schemas/apiEnums";
import {
  listTargets,
  targetKeys,
  type Target,
  type TargetListQuery,
} from "@/services/targets";
import { formatPercent } from "@/utils/decimal";
import { targetScopeName, type ScopeNames } from "@/utils/targetScope";

/**
 * One level of the hierarchy: its own query, its own page parameter, its own
 * table.
 *
 * Three sections rather than one table with a scope column, because the order
 * they appear in *is* the resolution rule — most specific first — and the
 * screen teaches it by shape instead of by a sentence alone. The price is three
 * page parameters in the URL, paid rather than dodged: one shared `page` would
 * step all three lists together, which is not a thing anyone means.
 *
 * No sortable header. `GET /api/targets/` declares no `ordering` parameter, and
 * a control that cannot work is not offered — the same rule the ledger and the
 * pricing list already follow.
 */
export function ScopeSection({
  scope,
  page,
  onPageChange,
  includeArchived,
  names,
  onArchive,
  onRestore,
}: {
  scope: TargetScope;
  page: number;
  onPageChange: (page: number) => void;
  includeArchived: boolean;
  names: ScopeNames;
  onArchive: (target: Target) => void;
  onRestore: (target: Target) => void;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  const query: TargetListQuery = {
    scope,
    page,
    include_archived: includeArchived || undefined,
  };

  const list = usePaginatedQuery({
    queryKey: targetKeys.list(query),
    queryFn: () => listTargets(query),
    page,
    onPageChange,
  });

  const headingId = `targets-${scope}`;

  /**
   * The ladder's first rung, as a real figure. "3 steps" is chrome where the
   * rate is the fact, and `PRODUCT.md`'s first principle puts the figures in
   * front — so the count only appears as the remainder.
   */
  const stepsSummary = (target: Target) => {
    const [first, ...rest] = target.steps;
    if (!first) return "—";

    const summary = t("targets.stepSummary", {
      rate: formatPercent(first.rate, locale),
      period: t(`enums.period.${first.rate_period}`),
      month: first.from_month,
    });

    return rest.length > 0
      ? `${summary} · ${t("targets.moreSteps", { count: rest.length })}`
      : summary;
  };

  const floorSummary = (target: Target) =>
    target.loss_limit_pct && target.loss_limit_period
      ? `${formatPercent(target.loss_limit_pct, locale)} ${t(
          `enums.period.${target.loss_limit_period}`,
        )}`
      : "—";

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-sm font-medium">
        {t(`enums.targetScope.${scope}`)}
      </h2>

      {list.error ? (
        <ListError onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        <ListSkeleton />
      ) : list.count === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("targets.sectionEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("targets.columns.appliesTo")}</TableHead>
                <TableHead>{t("targets.columns.steps")}</TableHead>
                <TableHead>{t("targets.columns.floor")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("structure.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((target) => {
                const name = targetScopeName(target, names, t);

                return (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={PATHS.TARGETS_EDIT}
                          params={{ id: target.id }}
                          className="hover:underline"
                        >
                          {name}
                        </Link>
                        {target.archived_at !== null && (
                          <Badge variant="outline">
                            {t("structure.archivedBadge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {stepsSummary(target)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {floorSummary(target)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("structure.openMenu", { name })}
                          >
                            <IconDots aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              to={PATHS.TARGETS_EDIT}
                              params={{ id: target.id }}
                            >
                              <IconPencil aria-hidden />
                              {t("structure.edit")}
                            </Link>
                          </DropdownMenuItem>
                          {target.archived_at === null ? (
                            <DropdownMenuItem
                              onSelect={() => onArchive(target)}
                            >
                              <IconArchive aria-hidden />
                              {t("structure.archive")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => onRestore(target)}
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
    </section>
  );
}
