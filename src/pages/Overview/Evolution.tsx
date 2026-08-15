/**
 * How the scope got here, and where its own record points.
 *
 * The chart is decorative and the table is the readout. The chart's hover
 * readout is a convenience on top of that, never the only route to a figure —
 * which is what lets the chart stay `aria-hidden` instead of duplicating this
 * table as announced noise.
 *
 * History and forecast are two reads because they are two kinds of claim. They
 * meet in one array only at the point of drawing, where `projected` marks which
 * half is which.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedPercent } from "@/components/SignedPercent";
import {
  TimeSeriesChart,
  type TimeSeriesPoint,
} from "@/components/TimeSeriesChart";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { forecastQuery, historyQuery } from "@/services/portfolio";
import { formatMoney } from "@/utils/money";

/**
 * The API's own `MIN_SAMPLE_MONTHS`, which it does not publish.
 *
 * `INSUFFICIENT_HISTORY` covers two different situations: too few complete
 * months to sample, and enough months whose geometric mean has no real root
 * because one of them wiped the capital out (a factor at or below zero). The
 * reason code is the same for both, and `sample_months` is what separates
 * them — without this the second case would print "based on 13 months; 6 are
 * needed", which contradicts itself and explains nothing.
 */
const MIN_SAMPLE_MONTHS = 6;

export function Evolution({ accountId }: { accountId: string | undefined }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const history = useQuery(historyQuery(accountId));
  const forecast = useQuery(forecastQuery(accountId));

  const points = history.data?.points ?? [];
  const projected = forecast.data?.points ?? [];

  const series: TimeSeriesPoint[] = [
    ...points.map((point) => ({
      month: point.month,
      value: point.total_value?.amount ?? null,
    })),
    ...projected.map((point) => ({
      month: point.month,
      value: point.expected.amount,
      projected: true,
      low: point.low.amount,
      high: point.high.amount,
    })),
  ];

  if (history.isPending) return null;

  const drawable = series.some((point) => point.value !== null);

  // The chart carries plain numbers; currency and locale stay here, which is
  // what keeps it swappable. The reporting currency is the one every figure in
  // this response is already expressed in.
  const currency = history.data?.reporting_currency ?? "BRL";
  const formatValue = (value: number) =>
    formatMoney({ amount: value, currency }, locale);

  // Axis ticks abbreviate — "R$180K", not "R$180,000.00" — because a full
  // currency string at every gridline is four times the width for a number
  // nobody reads precisely off an axis.
  //
  // This is the one place money is allowed through a float, and only because
  // it is already through one: a chart maps values to pixels, so Recharts hands
  // this a `number` whatever `money.ts` would prefer. Nothing exact is claimed
  // from it — the table below carries every figure as the string the server
  // sent, and it is the table, not the axis, that anyone reconciles against.
  const compact = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatTick = (value: number) => compact.format(value / 100);

  return (
    <section aria-labelledby="overview-evolution" className="space-y-4">
      <h2 id="overview-evolution" className="text-sm font-medium">
        {t("overview.evolution.title")}
      </h2>

      {drawable ? (
        <TimeSeriesChart
          points={series}
          formatValue={formatValue}
          formatTick={formatTick}
          labels={{
            actual: t("overview.evolution.value"),
            estimate: t("overview.evolution.estimateSeries"),
            range: t("overview.evolution.rangeSeries"),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("overview.evolution.unvalued")}
        </p>
      )}

      {forecast.data?.unavailable_reason === "INSUFFICIENT_HISTORY" && (
        <p className="text-sm text-muted-foreground">
          {forecast.data.sample_months < MIN_SAMPLE_MONTHS
            ? t("overview.evolution.insufficient", {
                count: forecast.data.sample_months,
              })
            : t("overview.evolution.noRate", {
                count: forecast.data.sample_months,
              })}
        </p>
      )}
      {forecast.data?.unavailable_reason === "NOT_VALUED" && (
        <p className="text-sm text-muted-foreground">
          {t("overview.evolution.notValued")}
        </p>
      )}

      <div className="overflow-x-auto">
        <table
          aria-label={t("overview.evolution.tableLabel")}
          className="w-full text-sm"
        >
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th scope="col" className="font-normal">
                {t("overview.evolution.month")}
              </th>
              <th scope="col" className="text-right font-normal">
                {t("overview.evolution.value")}
              </th>
              <th scope="col" className="text-right font-normal">
                {t("overview.evolution.netFlow")}
              </th>
              <th scope="col" className="text-right font-normal">
                {t("overview.evolution.monthlyReturn")}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {points.map((point) => (
              <tr key={point.month}>
                <th scope="row" className="text-left font-normal">
                  {point.month}
                  {point.partial && ` ${t("overview.evolution.partial")}`}
                </th>
                <td className="text-right">
                  {point.total_value ? (
                    <MoneyValue value={point.total_value} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="text-right">
                  <MoneyValue value={point.net_flow} />
                </td>
                <td className="text-right">
                  {point.monthly_return ? (
                    <SignedPercent value={point.monthly_return} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {projected.map((point) => (
              <tr key={point.month} className="text-muted-foreground">
                <th scope="row" className="text-left font-normal">
                  {point.month} {t("overview.evolution.estimate")}
                </th>
                <td className="text-right">
                  <MoneyValue value={point.expected} />
                </td>
                <td className="text-right">—</td>
                <td className="text-right">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
