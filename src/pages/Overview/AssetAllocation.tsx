/**
 * Where the money sits, one bar per asset.
 *
 * **Why this is not the stacked `AllocationBar`.** That component is right for
 * the dimensions `/app/allocation` shows — archetype, currency, country — which
 * run to four or five non-negative slices. By asset it failed on three counts
 * at once, and the third was not cosmetic:
 *
 *   1. It cycles four fills (`--chart-2`…`--chart-5`) and a real portfolio here
 *      has eight or more rows, so fills repeat and two different assets wear
 *      the same colour.
 *   2. Its own notes record that adjacent steps of the gold ramp measure
 *      1.40:1 to 1.68:1 against each other — far under 3:1. Colour could never
 *      identify a slice, however few there were, because `PRODUCT.md` spends
 *      one accent and five unrelated hues are the anti-reference.
 *   3. **Free cash goes negative.** `weightToWidth` clamps a negative weight to
 *      `0%`, so an overdrawn cash position vanished entirely while the positive
 *      slices summed past 100% and overflowed the track. The bar was not merely
 *      hard to read, it was wrong.
 *
 * So identity moved off colour and onto position: every bar is labelled on the
 * axis beside it, every bar is the same `--chart-4`, and nothing is encoded by
 * fill at all. A negative bar runs left of the zero line, which is the honest
 * picture of money owed against a position.
 *
 * **Sorted by value, descending, in both the chart and the table**, so the two
 * read as one object. The server returns them alphabetically, which answers no
 * question anyone brings to this block; "what is biggest" is the question, and
 * a shared order is what lets the eye move between the drawing and the figures
 * without re-finding its place.
 *
 * The chart is decorative and `aria-hidden`; the table below is the exact
 * readout, carrying every label, value, cost and share as the strings the
 * server sent. The hover readout is a convenience on top of that, never the
 * only route to a number.
 *
 * Free cash arrives as a row with a null asset rather than a sentinel string —
 * the shape the API chose precisely so a client cannot mistake it for an asset
 * id, after Phase 8 printed `FREE_CASH` as a raw key from the archetype
 * dimension, where the discriminator was only a magic string.
 *
 * The link to `/app/allocation` lives here because that screen is absent from
 * the sidebar: this is its only way in.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import { PercentValue } from "@/components/PercentValue";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import { allocationQuery } from "@/services/portfolio";
import { formatMoney } from "@/utils/money";

/** Enough room for a bar and its label without crowding, per row. */
const ROW_HEIGHT = 32;
const CHART_PADDING = 48;

export function AssetAllocation({
  accountId,
}: {
  accountId: string | undefined;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const { data } = useQuery(allocationQuery(accountId));

  if (!data || data.by_asset.length === 0) return null;

  const label = (asset: { name: string } | null) =>
    asset ? asset.name : t("overview.byAsset.freeCash");

  // Largest first. `toSorted` leaves the query cache's array untouched, which
  // matters because React Query hands out the cached object itself.
  const slices = data.by_asset.toSorted(
    (a, b) => b.value.amount - a.value.amount,
  );

  const currency = data.reporting_currency;
  const formatValue = (value: number) =>
    formatMoney({ amount: value, currency }, locale);

  // See `Evolution.tsx` for why an axis tick is the one place money is allowed
  // through a float: the chart already mapped it to a pixel.
  const compact = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const rows = slices.map((slice) => ({
    label: label(slice.asset),
    value: slice.value.amount,
    invested: slice.invested?.amount ?? null,
    weight: slice.weight,
  }));

  const hasNegative = rows.some((row) => row.value < 0);

  const config = {
    value: { label: t("overview.byAsset.value"), color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <section aria-labelledby="overview-by-asset" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="overview-by-asset" className="text-sm font-medium">
          {t("overview.byAsset.title")}
        </h2>
        <Link
          to={PATHS.ALLOCATION}
          className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
        >
          {t("overview.seeAllocation")}
          <IconArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      <ChartContainer
        aria-hidden="true"
        config={config}
        className="w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
        style={{ height: rows.length * ROW_HEIGHT + CHART_PADDING }}
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
        >
          {/* Kept rather than hidden: without a scale the bars are only
              relative to each other, and "how much" is half the question. */}
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tickFormatter={(value: number) => compact.format(value / 100)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={150}
            tickMargin={6}
          />

          {/* Only when something is actually negative: a zero rule through a
              chart where every bar starts at zero is a line under nothing. */}
          {hasNegative && <ReferenceLine x={0} stroke="var(--border)" />}

          <ChartTooltip
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_value, _name, item) => {
                  const row = item.payload as (typeof rows)[number];
                  return (
                    <dl className="grid w-full gap-1">
                      <Figure
                        term={t("overview.byAsset.value")}
                        value={formatValue(row.value)}
                      />
                      <Figure
                        term={t("overview.byAsset.invested")}
                        value={
                          row.invested === null
                            ? "—"
                            : formatValue(row.invested)
                        }
                      />
                      <Figure
                        term={t("overview.byAsset.weight")}
                        value={
                          row.weight === null
                            ? "—"
                            : `${(Number(row.weight) * 100).toFixed(2)}%`
                        }
                      />
                    </dl>
                  );
                }}
              />
            }
          />

          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={3}
            barSize={14}
          />
        </BarChart>
      </ChartContainer>

      <div className="overflow-x-auto">
        <table
          aria-label={t("overview.byAsset.tableLabel")}
          className="w-full text-sm"
        >
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th scope="col" className="font-normal">
                {t("overview.byAsset.asset")}
              </th>
              <th scope="col" className="text-right font-normal">
                <span className="inline-flex items-center gap-0.5">
                  {t("overview.byAsset.value")}
                  <InfoHint metric="allocation.value" />
                </span>
              </th>
              <th scope="col" className="text-right font-normal">
                <span className="inline-flex items-center gap-0.5">
                  {t("overview.byAsset.invested")}
                  <InfoHint metric="allocation.invested" />
                </span>
              </th>
              <th scope="col" className="text-right font-normal">
                <span className="inline-flex items-center gap-0.5">
                  {t("overview.byAsset.weight")}
                  <InfoHint metric="allocation.weight" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {slices.map((slice) => (
              <tr key={slice.asset?.id ?? "free-cash"}>
                <th scope="row" className="text-left font-normal">
                  {label(slice.asset)}
                </th>
                <td className="text-right">
                  <MoneyValue value={slice.value} />
                </td>
                <td className="text-right">
                  {slice.invested ? (
                    <MoneyValue value={slice.invested} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="text-right">
                  {slice.weight ? (
                    <PercentValue value={slice.weight} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** One labelled figure in the hover readout. */
function Figure({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
