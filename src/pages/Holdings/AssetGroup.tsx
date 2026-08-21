import { useId } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { InstitutionLogo } from "@/components/InstitutionLogo";
import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import { SignedFigure } from "@/components/SignedFigure";
import { SignedPercent } from "@/components/SignedPercent";
import { UnpricedNote } from "@/components/UnpricedNote";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { InstanceRows } from "@/pages/Holdings/InstanceRows";
import { PATHS } from "@/routes/path";
import type { HoldingsGrain } from "@/schemas/portfolioView";
import type { MissingFigure } from "@/services/portfolio";
import { formatDecimal, SCALE } from "@/utils/decimal";
import type { AssetGroup } from "@/utils/holdings";
import { formatUnitPrice } from "@/utils/money";

/**
 * One asset, and everywhere it is held.
 *
 * The header states the whole position; the rows state where it sits. That
 * order is the pivot's argument — someone opening this screen wants the total
 * exposure first and the custody second, which is exactly the reverse of the
 * institution pivot.
 *
 * **The average cost is a price, not money.** A per-unit figure carries up to
 * twelve decimal places where a currency's own default is two, so `MoneyValue`
 * would silently truncate a real number. `formatUnitPrice` keeps it a decimal
 * string the whole way, the same treatment the pricing screen gives a quote.
 *
 * A position the server could not value shows `UnpricedNote` and never a zero,
 * and its group says the total is short of it rather than presenting a partial
 * sum as a complete one.
 */
export function AssetGroupBlock({
  group,
  isOpen,
  onToggle,
  grain,
  missing,
}: {
  group: AssetGroup;
  isOpen: boolean;
  onToggle: () => void;
  grain: HoldingsGrain;
  missing: readonly MissingFigure[];
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const titleId = useId();
  const bodyId = useId();

  const name = group.asset?.name ?? "—";
  const currency = group.asset?.currency;

  const reasonFor = (accountId: string) =>
    missing.find(
      (row) => row.account === accountId && row.asset === group.assetId,
    )?.reason ?? null;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {isOpen ? (
            <IconChevronDown aria-hidden className="size-4 shrink-0" />
          ) : (
            <IconChevronRight aria-hidden className="size-4 shrink-0" />
          )}
          <span id={titleId} className="font-medium">
            {name}
          </span>
        </button>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          {group.quantity !== null && (
            <span className="font-mono tabular-nums">
              {formatDecimal(group.quantity, locale, SCALE.quantity)}
            </span>
          )}
          {group.value === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <MoneyValue value={group.value} className="font-medium" />
          )}
          {group.totalReturn !== null && (
            <SignedPercent value={group.totalReturn} />
          )}
        </div>
      </div>

      <div id={bodyId} hidden={!isOpen} className="space-y-3">
        {/* What the headline rate is made of, and the per-unit figures behind
            it. The rate is a *total* return: it counts appreciation the reader
            has not sold and could not spend, so a screen that printed only the
            percentage would be asking to be trusted on the one figure a
            careful reader most wants to open. These sit under the header
            rather than in it because the header leads with what the position
            is worth. */}
        <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          {group.invested !== null && (
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                {t("holdings.totals.invested")}
                <InfoHint metric="holding.invested" />
              </dt>
              <dd>
                <MoneyValue value={group.invested} />
              </dd>
            </div>
          )}
          {group.unrealizedGain !== null && (
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                {t("holdings.totals.unrealized")}
                <InfoHint metric="holding.unrealized_gain" />
              </dt>
              <dd>
                <SignedFigure value={group.unrealizedGain} />
              </dd>
            </div>
          )}
          {currency !== undefined && group.unitCost !== null && (
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                {t("holdings.totals.unitCost")}
                <InfoHint metric="holding.average_cost" />
              </dt>
              <dd className="font-mono tabular-nums">
                {formatUnitPrice(group.unitCost, currency, locale)}
              </dd>
            </div>
          )}
          {currency !== undefined && group.currentPrice !== null && (
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                {t("holdings.totals.currentPrice")}
                <InfoHint metric="holding.current_price" />
              </dt>
              <dd className="font-mono tabular-nums">
                {formatUnitPrice(group.currentPrice, currency, locale)}
              </dd>
            </div>
          )}
        </dl>

        {!group.complete && (
          <p className="text-sm text-muted-foreground">
            {t("holdings.totals.partial")}
          </p>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("holdings.columns.asset")}</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("holdings.columns.quantity")}
                    <InfoHint metric="holding.quantity" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("holdings.columns.value")}
                    <InfoHint metric="holding.current_value" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-0.5">
                    {t("holdings.columns.return")}
                    <InfoHint metric="holding.total_return" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.flatMap((row) => [
                <TableRow key={row.holding.account}>
                  <TableCell>
                    <Link
                      to={PATHS.HOLDING_DETAIL}
                      params={{
                        accountId: row.holding.account,
                        assetId: row.holding.asset,
                      }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.account?.name ?? t("holdings.unknownAccount")}
                    </Link>
                    {row.institution !== null && (
                      // The mark replaces the middot: it already reads as the
                      // break between the account and who holds it, and two
                      // separators for one join is one too many.
                      <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-muted-foreground">
                        <InstitutionLogo
                          name={row.institution.name}
                          logo={row.institution.logo}
                          size="sm"
                        />
                        {row.institution.name}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {row.holding.quantity === null
                      ? "—"
                      : formatDecimal(
                          row.holding.quantity,
                          locale,
                          SCALE.quantity,
                        )}
                  </TableCell>

                  <TableCell className="text-right">
                    {row.holding.value === null || !row.holding.complete ? (
                      <UnpricedNote
                        reason={reasonFor(row.holding.account) ?? "NO_QUOTE"}
                      />
                    ) : (
                      <MoneyValue value={row.holding.value} />
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {row.holding.total_return === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <SignedPercent value={row.holding.total_return} />
                    )}
                  </TableCell>
                </TableRow>,

                // Beneath the account row rather than instead of it: the row
                // states the position, the purchases state what built it.
                grain === "instance" && isOpen ? (
                  <TableRow key={`${row.holding.account}-instances`}>
                    <TableCell colSpan={4} className="bg-muted/30">
                      <InstanceRows
                        accountId={row.holding.account}
                        assetId={row.holding.asset}
                        currency={currency}
                      />
                    </TableCell>
                  </TableRow>
                ) : null,
              ])}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
