/**
 * The sales table: one row per sold-from lot, expandable into its tranches.
 *
 * A lot disposed of in a single movement renders as one row with nothing to
 * open. A lot sold across several movements — a partial sell followed by
 * another, a redemption followed by a maturity — renders as a parent row
 * that expands into one sub-row per disposal, each carrying its own date and
 * its own result. The expander is a real `<button aria-expanded>`, and a lot
 * with exactly one sale gets none at all: an affordance that leads nowhere is
 * worse than no affordance.
 *
 * `profit_rate` arrives as the same 0.1375-means-13.75% fraction every other
 * rate in this app (`lot_return`, `total_return`, `weight`) uses, so it goes
 * straight into `SignedPercent` with no adjustment on this side.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import { SignedFigure } from "@/components/SignedFigure";
import { SignedPercent } from "@/components/SignedPercent";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import type { SaleExit, SaleRow } from "@/services/sales";
import { type CalendarDate, formatCalendarDate } from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";
import { formatUnitPrice } from "@/utils/money";
import { accountLabel } from "@/utils/accountLabel";

export function SalesTable({ rows }: { rows: SaleRow[] }) {
  const { t } = useTranslation("app");

  return (
    <div className="space-y-3">
      <div className="content-surface overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sales.columns.asset")}</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-0.5">
                  {t("sales.columns.costRemoved")}
                  <InfoHint metric="sale.cost_removed" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-0.5">
                  {t("sales.columns.quantity")}
                  <InfoHint metric="sale.quantity_sold" />
                </span>
              </TableHead>
              <TableHead>{t("sales.columns.purchasedOn")}</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-0.5">
                  {t("sales.columns.proceeds")}
                  <InfoHint metric="sale.proceeds" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-0.5">
                  {t("sales.columns.profit")}
                  <InfoHint metric="sale.profit" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-0.5">
                  {t("sales.columns.profitRate")}
                  <InfoHint metric="sale.profit_rate" />
                </span>
              </TableHead>
              <TableHead>{t("sales.columns.soldOn")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <SaleLotRow key={row.lot.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* The limitation gets declared where it is felt. */}
      <p className="text-xs text-muted-foreground">{t("sales.feeNote")}</p>
    </div>
  );
}

export function SaleLotRow({ row }: { row: SaleRow }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const [open, setOpen] = useState(false);

  // Nothing to open into: a single-sale lot's expander would lead nowhere.
  const expandable = row.sales.length > 1;

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-nowrap">
          <div className="flex items-center gap-2">
            {expandable && (
              <button
                type="button"
                aria-expanded={open}
                aria-label={t(open ? "sales.collapse" : "sales.expand")}
                onClick={() => setOpen((prev) => !prev)}
                className="shrink-0 rounded-md p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
              >
                {open ? (
                  <IconChevronDown aria-hidden className="size-4" />
                ) : (
                  <IconChevronRight aria-hidden className="size-4" />
                )}
              </button>
            )}
            <div>
              <div>{row.asset.name}</div>
              <div className="text-xs text-muted-foreground">
                {accountLabel(row.account, t)}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">
          {/* cost_removed, not the lot's lifetime cost (`row.cost`): this is
              the figure `profit`/`profit_rate` are actually computed
              against, so it is the only cost that reconciles with the
              proceeds and profit columns on this same row. The lot's
              lifetime cost is not shown here — it belongs beside
              `purchased_on`, a lot-level fact, not a window one. */}
          <MoneyValue value={row.cost_removed.native} />
        </TableCell>
        <TableCell className="text-right font-mono text-sm tabular-nums">
          {/* Principal-based archetypes (fixed income, cash deposits) carry a
              principal rather than a unit price, so there is no quantity to
              multiply — an em dash, never a fabricated "1 ×". */}
          {row.entry_quantity !== null && row.entry_unit_price !== null
            ? `${formatDecimal(row.entry_quantity, locale, SCALE.quantity)} × ${formatUnitPrice(
                row.entry_unit_price,
                row.asset.currency,
                locale,
              )}`
            : "—"}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {row.purchased_on !== null
            ? formatCalendarDate(row.purchased_on as CalendarDate, locale)
            : "—"}
        </TableCell>
        <TableCell className="text-right">
          <MoneyValue value={row.proceeds.native} />
        </TableCell>
        <TableCell className="text-right">
          <SignedFigure value={row.profit.native} />
        </TableCell>
        <TableCell className="text-right">
          {/* null means incomputable (no cost was removed), never a 0%. */}
          {row.profit_rate !== null ? (
            <SignedPercent value={row.profit_rate} />
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <div className="flex items-center gap-2">
            {formatCalendarDate(row.sold_on as CalendarDate, locale)}
            {/* A word, never colour alone. */}
            {!row.fully_sold && (
              <>
                <Badge variant="outline">{t("sales.partial")}</Badge>
                <InfoHint metric="sale.fully_sold" />
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expandable &&
        open &&
        row.sales.map((sale) => (
          <SaleExitRow
            key={sale.movement ?? `${sale.kind}-${sale.sold_on}`}
            sale={sale}
          />
        ))}
    </>
  );
}

export function SaleExitRow({ sale }: { sale: SaleExit }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  return (
    <TableRow className="bg-muted/30 text-sm">
      <TableCell className="py-2 pl-10 whitespace-nowrap text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          {t(`sales.kind.${sale.kind}`)}
          <InfoHint metric="sale.kind" />
        </span>
      </TableCell>
      <TableCell className="py-2 text-right">
        {/* Each tranche has its own cost_removed — showing it here keeps a
            sub-row reconciling the same way its parent does. */}
        <MoneyValue value={sale.cost_removed.native} />
      </TableCell>
      <TableCell className="py-2 text-right font-mono text-sm tabular-nums">
        {sale.quantity !== null
          ? formatDecimal(sale.quantity, locale, SCALE.quantity)
          : "—"}
      </TableCell>
      <TableCell className="py-2 text-muted-foreground">—</TableCell>
      <TableCell className="py-2 text-right">
        <MoneyValue value={sale.proceeds.native} />
      </TableCell>
      <TableCell className="py-2 text-right">
        <SignedFigure value={sale.profit.native} />
      </TableCell>
      <TableCell className="py-2 text-right">
        {sale.profit_rate !== null ? (
          <SignedPercent value={sale.profit_rate} />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="py-2 whitespace-nowrap">
        {formatCalendarDate(sale.sold_on as CalendarDate, locale)}
      </TableCell>
    </TableRow>
  );
}
