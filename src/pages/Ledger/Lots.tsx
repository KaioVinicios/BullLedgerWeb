/**
 * Lots, read-only — how the contributions to one holding were grouped, and what
 * is left of each.
 *
 * Read-only is a decision, not an omission. The API can rename a lot and
 * archive one; Phase 6 consumes neither, because a lot is *opened by what you
 * record* rather than authored, and a screen that let you edit the grouping
 * would invite exactly the mental model the ledger is built to avoid. Every
 * figure here is read from the holding projection and none is computed: the
 * return arrives as a decimal-string fraction and becomes a percentage without
 * a division ever happening on this side.
 *
 * The holding lives in the URL, both halves of it, because a lot means nothing
 * outside one — and because a link to a holding's grouping is worth sending.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconStack2 } from "@tabler/icons-react";

import { EmptyState } from "@/components/EmptyState";
import { ListError } from "@/components/ListError";
import { ListSkeleton } from "@/components/ListSkeleton";
import { MoneyValue } from "@/components/MoneyValue";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PercentValue } from "@/components/PercentValue";
import { SignedFigure } from "@/components/SignedFigure";
import { Badge } from "@/components/ui/badge";
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
import { PATHS } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { holdingQuery, type LotProjection } from "@/services/portfolio";
import { formatDecimal, SCALE } from "@/utils/decimal";

const route = getRouteApi(PATHS.LEDGER_LOTS);

/** Only live rows: an archived holding takes no new contributions. */
const LIVE = {} as const;

export function LedgerLotsPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  const chosen = Boolean(search.account && search.asset);
  const holding = useQuery({
    ...holdingQuery(search.account ?? "", search.asset ?? ""),
    enabled: chosen,
  });

  return (
    <PageContainer>
      <PageHeader
        title={t("ledger.lotsScreen.title")}
        description={t("ledger.lotsScreen.description")}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <HoldingSelect
            id="lots-account"
            label={t("ledger.filters.account")}
            value={search.account}
            options={accounts?.results ?? []}
            onChange={(account) =>
              void navigate({ search: (prev) => ({ ...prev, account }) })
            }
          />
          <HoldingSelect
            id="lots-asset"
            label={t("ledger.filters.asset")}
            value={search.asset}
            options={assets?.results ?? []}
            onChange={(asset) =>
              void navigate({ search: (prev) => ({ ...prev, asset }) })
            }
          />
        </div>

        {!chosen ? (
          <EmptyState
            icon={IconStack2}
            title={t("ledger.lotsScreen.title")}
            description={t("ledger.lotsScreen.selectHolding")}
          />
        ) : holding.error ? (
          <ListError onRetry={() => void holding.refetch()} />
        ) : holding.isPending ? (
          <ListSkeleton />
        ) : holding.data.lots.length === 0 ? (
          <EmptyState
            icon={IconStack2}
            title={t("ledger.lotsScreen.title")}
            description={t("ledger.lotsScreen.empty")}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("ledger.lotsScreen.columns.label")}
                    </TableHead>
                    <TableHead>
                      {t("ledger.lotsScreen.columns.status")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.remaining")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.invested")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.income")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.realized")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.unrealized")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("ledger.lotsScreen.columns.return")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holding.data.lots.map((lot) => (
                    <LotRow key={lot.lot} lot={lot} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Why there is nothing to press. */}
            <p className="text-xs text-muted-foreground">
              {t("ledger.lotsScreen.readOnly")}
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function LotRow({ lot }: { lot: LotProjection }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{lot.label}</TableCell>
      <TableCell>
        {/* A word, never colour alone. */}
        <Badge variant={lot.status === "OPEN" ? "secondary" : "outline"}>
          {t(`ledger.lotsScreen.status.${lot.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono text-sm tabular-nums">
        {lot.quantity_remaining !== null ? (
          formatDecimal(lot.quantity_remaining, locale, SCALE.quantity)
        ) : lot.principal_remaining !== null ? (
          <MoneyValue value={lot.principal_remaining.native} />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        <MoneyValue value={lot.invested.native} />
      </TableCell>
      <TableCell className="text-right">
        <MoneyValue value={lot.income_attributed.native} />
      </TableCell>
      <TableCell className="text-right">
        <SignedFigure value={lot.realized_gain.native} />
      </TableCell>
      <TableCell className="text-right">
        {lot.unrealized_gain !== null ? (
          <SignedFigure value={lot.unrealized_gain.native} />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        {lot.lot_return !== null ? (
          <PercentValue value={lot.lot_return} />
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}

function HoldingSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  options: ReadonlyArray<{ id: string; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-56">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
