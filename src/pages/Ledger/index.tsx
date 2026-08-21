/**
 * The ledger: every recorded fact, newest first.
 *
 * It wears the structure screens' list pattern — URL-driven state, the
 * loading / empty / error triad, `usePaginatedQuery` — with one addition of its
 * own and one deliberate absence.
 *
 * The addition is voided rows, hidden until asked for. The absence is sorting:
 * `GET /api/movements/` declares no `ordering` parameter, and the order it
 * serves (`occurred_on`, then entry time) is the order the domain means. A
 * sortable header here would be a control that cannot work, so there is none.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconArrowsExchange,
  IconBan,
  IconDots,
  IconNotebook,
  IconPencil,
  IconPlus,
  IconStack2,
} from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListPagination } from "@/components/ListPagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { ShowVoidedToggle } from "@/components/ShowVoidedToggle";
import { SignedFigure } from "@/components/SignedFigure";
import { VoidConfirmDialog } from "@/components/VoidConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { useVoidMovement } from "@/hooks/useVoidMovement";
import { PATHS } from "@/routes/path";
import { accountLabel, labelAccountById } from "@/utils/accountLabel";
import { MOVEMENT_TYPES, type MovementType } from "@/schemas/apiEnums";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import {
  isTransferLeg,
  listMovements,
  movementKeys,
  type Movement,
  type MovementListQuery,
} from "@/services/movements";
import {
  formatCalendarDate,
  toCalendarDate,
  type CalendarDate,
} from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";

const route = getRouteApi(PATHS.LEDGER);

/** Radix select values are strings; "no filter" needs one of its own. */
const ALL = "all";

/** Only live rows are worth filtering by; an archived one takes no new entries. */
const LIVE = {} as const;

export function LedgerPage() {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const page = search.page ?? 1;
  const includeVoided = search.include_voided ?? false;

  const query: MovementListQuery = {
    page,
    include_voided: includeVoided || undefined,
    account: search.account,
    asset: search.asset,
    type: search.type,
    occurred_after: search.occurred_after,
    occurred_before: search.occurred_before,
  };

  const list = usePaginatedQuery({
    queryKey: movementKeys.list(query),
    queryFn: () => listMovements(query),
    page,
    onPageChange: (nextPage) =>
      void navigate({ search: (prev) => ({ ...prev, page: nextPage }) }),
  });

  // The rows name their account and asset by id; these two reads are what turn
  // those back into names, and what fills the two filter selects.
  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  const voiding = useVoidMovement();

  const nameOf = (
    rows: ReadonlyArray<{ id: string; name: string }> | undefined,
    id: string | null,
  ) => (id ? (rows?.find((row) => row.id === id)?.name ?? "—") : "—");

  // Accounts are not named by `name` alone — their label derives from the
  // institution and the registration (business-rules.md). Assets keep `nameOf`.
  const accountNameOf = (id: string | null) =>
    labelAccountById(accounts?.results, id, t);

  const setFilter = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next, page: 1 }) });

  const isFiltered =
    search.account !== undefined ||
    search.asset !== undefined ||
    search.type !== undefined ||
    search.occurred_after !== undefined ||
    search.occurred_before !== undefined;

  const clearFilters = () =>
    void navigate({
      search: (prev) => ({
        include_voided: prev.include_voided,
        page: 1,
      }),
    });

  return (
    <PageContainer>
      <PageHeader
        title={t("screens.ledger.title")}
        description={t("screens.ledger.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={PATHS.LEDGER_LOTS}>
                <IconStack2 aria-hidden />
                {t("ledger.lots")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={PATHS.LEDGER_TRANSFER}>
                <IconArrowsExchange aria-hidden />
                {t("ledger.transfer")}
              </Link>
            </Button>
            <Button asChild>
              <Link to={PATHS.LEDGER_NEW}>
                <IconPlus aria-hidden />
                {t("ledger.record")}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <FilterSelect
              id="ledger-account"
              label={t("ledger.filters.account")}
              value={search.account}
              onChange={(account) => setFilter({ account })}
              allLabel={t("ledger.filters.all")}
              options={(accounts?.results ?? []).map((row) => ({
                value: row.id,
                label: accountLabel(row, t),
              }))}
            />
            <FilterSelect
              id="ledger-asset"
              label={t("ledger.filters.asset")}
              value={search.asset}
              onChange={(asset) => setFilter({ asset })}
              allLabel={t("ledger.filters.all")}
              options={(assets?.results ?? []).map((row) => ({
                value: row.id,
                label: row.name,
              }))}
            />
            <FilterSelect
              id="ledger-type"
              label={t("ledger.filters.type")}
              value={search.type}
              onChange={(type) => setFilter({ type: type as MovementType })}
              allLabel={t("ledger.filters.all")}
              options={MOVEMENT_TYPES.map((type) => ({
                value: type,
                label: t(`enums.movementType.${type}`),
              }))}
            />
            <div className="space-y-2">
              <Label htmlFor="ledger-from" className="font-normal">
                {t("ledger.filters.from")}
              </Label>
              <Input
                id="ledger-from"
                type="date"
                className="w-40"
                value={search.occurred_after ?? ""}
                // A date input reports every keystroke, and a half-typed date
                // is not a date. `toCalendarDate` is what decides — the same
                // check the URL schema applies — so an incomplete entry simply
                // does not filter rather than filtering by nonsense.
                onChange={(event) =>
                  setFilter({
                    occurred_after:
                      toCalendarDate(event.target.value) ?? undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger-to" className="font-normal">
                {t("ledger.filters.to")}
              </Label>
              <Input
                id="ledger-to"
                type="date"
                className="w-40"
                value={search.occurred_before ?? ""}
                onChange={(event) =>
                  setFilter({
                    occurred_before:
                      toCalendarDate(event.target.value) ?? undefined,
                  })
                }
              />
            </div>
          </div>

          <ShowVoidedToggle
            checked={includeVoided}
            onCheckedChange={(checked) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  include_voided: checked,
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
              icon={IconNotebook}
              title={t("ledger.noMatches.title")}
              description={t("ledger.noMatches.description")}
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {t("ledger.noMatches.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={IconNotebook}
              title={t("ledger.empty.title")}
              description={t("ledger.empty.description")}
              action={
                <Button asChild variant="outline">
                  <Link to={PATHS.LEDGER_NEW}>
                    <IconPlus aria-hidden />
                    {t("ledger.record")}
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <div className="content-surface overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ledger.columns.date")}</TableHead>
                  <TableHead>{t("ledger.columns.type")}</TableHead>
                  <TableHead>{t("ledger.columns.account")}</TableHead>
                  <TableHead>{t("ledger.columns.asset")}</TableHead>
                  <TableHead className="text-right">
                    {t("ledger.columns.quantity")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("ledger.columns.amount")}
                  </TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("structure.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((movement) => (
                  <LedgerRow
                    key={movement.id}
                    movement={movement}
                    locale={locale}
                    accountName={accountNameOf(movement.account)}
                    assetName={nameOf(assets?.results, movement.asset)}
                    onVoid={() => voiding.ask(movement)}
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

      <VoidConfirmDialog {...voiding.dialogProps} />
    </PageContainer>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
      >
        <SelectTrigger id={id} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LedgerRow({
  movement,
  locale,
  accountName,
  assetName,
  onVoid,
}: {
  movement: Movement;
  locale: string;
  accountName: string;
  assetName: string;
  onVoid: () => void;
}) {
  const { t } = useTranslation("app");
  const isVoided = movement.voided_at !== null;

  return (
    <TableRow className={cn(isVoided && "text-muted-foreground")}>
      <TableCell className="font-mono text-sm whitespace-nowrap">
        <Link
          to={PATHS.LEDGER_CORRECT}
          params={{ id: movement.id }}
          className="hover:underline"
        >
          {formatCalendarDate(movement.occurred_on as CalendarDate, locale)}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {t(`enums.movementType.${movement.type}`)}
          </Badge>
          {/* Never colour alone: voided is a word before it is a shade. */}
          {isVoided && (
            <Badge variant="outline">{t("ledger.voidedBadge")}</Badge>
          )}
        </div>
        {(isTransferLeg(movement) || movement.replaces !== null) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {isTransferLeg(movement)
              ? t("ledger.transferLeg")
              : t("ledger.corrects")}
          </p>
        )}
      </TableCell>
      <TableCell>{accountName}</TableCell>
      <TableCell>{assetName}</TableCell>
      <TableCell className="text-right font-mono text-sm tabular-nums">
        {movement.quantity_delta
          ? formatDecimal(movement.quantity_delta, locale, SCALE.quantity)
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        <SignedFigure value={movement.cash_delta} />
        {/* A fee that rode on a trade belongs to that trade. A standalone
            FEE/TAX is its own row, and blurring the two would misreport what
            was recorded. */}
        {movement.fee !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("ledger.withFee")}
          </p>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("structure.openMenu", {
                name: `${t(`enums.movementType.${movement.type}`)} — ${formatCalendarDate(
                  movement.occurred_on as CalendarDate,
                  locale,
                )}`,
              })}
            >
              <IconDots aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={PATHS.LEDGER_CORRECT} params={{ id: movement.id }}>
                <IconPencil aria-hidden />
                {t("ledger.form.correctTitle")}
              </Link>
            </DropdownMenuItem>
            {/* A voided row has nothing left to withdraw: the server answers
                `movement_already_voided`, so the action is not offered. */}
            {!isVoided && (
              <DropdownMenuItem onSelect={onVoid}>
                <IconBan aria-hidden />
                {t("ledger.void.action")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
