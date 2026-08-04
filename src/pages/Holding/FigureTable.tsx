import { useId } from "react";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedFigure } from "@/components/SignedFigure";
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
import type { HoldingDetail } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";
import type { Currency, Money } from "@/utils/money";
import type { components } from "@/types/api";

type MoneyPair = components["schemas"]["MoneyPair"];

/**
 * The full figure set, in the two currencies that are historical truth.
 *
 * This table is not a supplement to the headline — it is the only place cost
 * basis, costs, and principal exist at all, because `HoldingReporting` has no
 * form for them.
 *
 * **It collapses to one column when the asset's currency equals the account's.**
 * The decision is made from the two currency *codes* on the joined resources,
 * never by comparing amounts: two figures can be numerically equal at a rate of
 * 1.0 without being the same currency, and a screen that guessed from the
 * numbers would flicker between one and two columns as rates move. A
 * single-currency holding showing every number twice is the Bloomberg density
 * `PRODUCT.md` names as an anti-reference.
 */
export function FigureTable({
  holding,
  nativeCurrency,
  baseCurrency,
}: {
  holding: HoldingDetail;
  nativeCurrency: Currency;
  baseCurrency: Currency;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const captionId = useId();

  const collapsed = nativeCurrency === baseCurrency;

  const rows: Array<{
    label: string;
    pair: MoneyPair | null;
    signed?: boolean;
  }> = [
    { label: t("holding.figures.principal"), pair: holding.principal },
    { label: t("holding.figures.currentValue"), pair: holding.current_value },
    {
      label: t("holding.figures.costBasis"),
      pair: holding.cost_basis_remaining,
    },
    { label: t("holding.figures.invested"), pair: holding.invested },
    {
      label: t("holding.figures.realized"),
      pair: holding.realized_gain,
      signed: true,
    },
    {
      label: t("holding.figures.unrealized"),
      pair: holding.unrealized_gain,
      signed: true,
    },
    { label: t("holding.figures.income"), pair: holding.income_received },
    { label: t("holding.figures.costs"), pair: holding.costs },
  ];

  return (
    <section aria-labelledby={captionId} className="space-y-3">
      <div className="space-y-1">
        <h2 id={captionId} className="text-sm font-medium">
          {t("holding.figures.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {collapsed
            ? t("holding.figures.inOne", { currency: baseCurrency })
            : t("holding.figures.inTwo", {
                native: nativeCurrency,
                base: baseCurrency,
              })}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">
            {t("holding.figures.quantity")}
          </dt>
          <dd className="font-mono tabular-nums">
            {/* Null is legitimate: a lump-principal FIXED_INCOME position has
                no unit count, and an em dash is the honest render. */}
            {holding.quantity === null
              ? "—"
              : t("holding.figures.units", {
                  quantity: formatDecimal(
                    holding.quantity,
                    locale,
                    SCALE.quantity,
                  ),
                })}
          </dd>
        </div>

        {holding.holding_period_days !== null && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">
              {t("holding.figures.holdingPeriod")}
            </dt>
            <dd className="tabular-nums">
              {t("holding.figures.days", {
                count: holding.holding_period_days,
              })}
              {holding.holding_start && (
                <span className="ml-1 text-muted-foreground">
                  {t("holding.figures.since", {
                    date: formatCalendarDate(
                      holding.holding_start as CalendarDate,
                      locale,
                    ),
                  })}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="overflow-x-auto rounded-xl border">
        <Table aria-label={t("holding.figures.title")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("holding.figures.figure")}</TableHead>
              {collapsed ? (
                <TableHead className="text-right">{baseCurrency}</TableHead>
              ) : (
                <>
                  <TableHead className="text-right">
                    {t("holding.figures.nativeColumn", {
                      currency: nativeCurrency,
                    })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("holding.figures.baseColumn", {
                      currency: baseCurrency,
                    })}
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                {row.pair === null ? (
                  <TableCell colSpan={collapsed ? 1 : 2} className="text-right">
                    <UnpricedNote reason="NO_QUOTE" />
                  </TableCell>
                ) : collapsed ? (
                  <TableCell className="text-right">
                    <Amount value={row.pair.base} signed={row.signed} />
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="text-right">
                      <Amount value={row.pair.native} signed={row.signed} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Amount value={row.pair.base} signed={row.signed} />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

/** A gain carries its direction; a balance simply states itself. */
function Amount({ value, signed }: { value: Money; signed?: boolean }) {
  return signed ? <SignedFigure value={value} /> : <MoneyValue value={value} />;
}
