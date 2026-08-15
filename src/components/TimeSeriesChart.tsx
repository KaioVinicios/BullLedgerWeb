/**
 * One series over time — history, and the projection that extends it.
 *
 * **Recharts, through `ui/chart.tsx`.** The first cut of this file drew the
 * path by hand to avoid a runtime dependency; the drawing was rejected on
 * sight, and the plan named this as the fallback for exactly that outcome. The
 * props did not change in the swap, which is what the hand-written version's
 * own docstring promised: `Evolution.tsx` was not touched.
 *
 * What the library buys, and the hand-rolled version could not justify
 * rebuilding: real axes with ticks the reader can read values off, a grid to
 * carry the eye across eighteen months, and a hover readout. Those are the
 * reasons a chart beats a table at a glance, and without them the drawing was
 * a decorative squiggle above the table that already said everything.
 *
 * **Still decorative, and still marked as such.** `aria-hidden`, and every
 * figure it plots is in the table beside it — the contract `AllocationBar`
 * set. The hover readout is a mouse convenience layered on top of that, never
 * the only route to a number, which is what lets the whole chart stay hidden
 * from assistive technology instead of duplicating the table as announced
 * noise.
 *
 * **The stroke is `--chart-4`, measured on the ground it sits on.**
 * `AllocationBar` picked chart-4 as the only step of the gold ramp clearing
 * 3:1 in *both* themes against `--muted` — 4.47:1 light, 3.02:1 dark, with
 * chart-3 failing light (2.66:1) and chart-5 failing dark (2.17:1). This chart
 * sits on the page ground instead, so the reading was retaken by the same
 * method (oklch → linear sRGB → relative luminance, which reproduces the
 * recorded `#a65f00` exactly):
 *
 *   chart-4 #a65f00 vs --background: light 4.92:1   dark 4.04:1
 *
 * Both clear the 3:1 non-text bar with room. The band is the same hue at low
 * opacity and is *not* held to 3:1: it encodes nothing the dash pattern and the
 * table do not already carry.
 *
 * **Fact and estimate differ by stroke, never by hue** — solid past, dashed
 * projection, band as a low-opacity area — because `PRODUCT.md` forbids state
 * by colour alone, and one usable ramp step leaves no second hue anyway.
 *
 * **A null month breaks the line.** `connectNulls` is off: the server said it
 * could not value that month, and joining its neighbours would invent the
 * number it refused to invent.
 *
 * **The projection is anchored at the last valued month**, where its band
 * collapses to zero width. Drawn from its own points alone a forecast would
 * float detached from the history it extends, and a one-month forecast would
 * be a single unconnected dot.
 */
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { toRows, type TimeSeriesPoint } from "@/utils/timeSeries";

// Re-exported so importers name the chart, not its shaping module. A type-only
// export leaves the fast-refresh rule satisfied: nothing but the component
// survives to runtime.
export type { TimeSeriesPoint, TimeSeriesRow } from "@/utils/timeSeries";

export function TimeSeriesChart({
  points,
  formatValue = String,
  formatTick = formatValue,
  formatMonth = (month) => month,
  labels,
}: {
  points: TimeSeriesPoint[];
  /** Minor units to a display string — the caller owns currency and locale. */
  formatValue?: (value: number) => string;
  /** The same, abbreviated for an axis tick; defaults to `formatValue`. */
  formatTick?: (value: number) => string;
  formatMonth?: (month: string) => string;
  labels?: { actual: string; estimate: string; range: string };
}) {
  const reducedMotion = usePrefersReducedMotion();
  const rows = toRows(points);

  const config = {
    actual: {
      label: labels?.actual ?? "Actual",
      color: "var(--chart-4)",
    },
    estimate: {
      label: labels?.estimate ?? "Estimate",
      color: "var(--chart-4)",
    },
    range: {
      label: labels?.range ?? "Range",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      aria-hidden="true"
      config={config}
      className="h-56 w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
    >
      <ComposedChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
        {/* Horizontal only: the months are already named on the axis, and
            vertical rules through a dense series read as data. */}
        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatMonth}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickMargin={4}
          tickFormatter={formatTick}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatMonth(String(label))}
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="font-mono tabular-nums">
                    {/* The band's value is the `[low, high]` pair Recharts
                        reads a range area from, so it is read as a span rather
                        than pushed through `Number` — which would print NaN. */}
                    {Array.isArray(value)
                      ? `${formatValue(Number(value[0]))} – ${formatValue(
                          Number(value[1]),
                        )}`
                      : formatValue(Number(value))}
                  </span>
                </span>
              )}
            />
          }
        />

        {/* Drawn first so the line sits over its own envelope. */}
        <Area
          dataKey="range"
          stroke="none"
          fill="var(--color-estimate)"
          fillOpacity={0.15}
          connectNulls={false}
          isAnimationActive={!reducedMotion}
        />

        <Line
          dataKey="actual"
          type="monotone"
          stroke="var(--color-actual)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={!reducedMotion}
        />

        <Line
          dataKey="estimate"
          type="monotone"
          stroke="var(--color-estimate)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls={false}
          isAnimationActive={!reducedMotion}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
