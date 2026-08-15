/**
 * The shaping behind `TimeSeriesChart`, kept out of the component.
 *
 * Two reasons it lives here rather than beside the chart. The lint rule that
 * keeps fast refresh working forbids a component file from exporting anything
 * but components, and — the reason worth caring about — this is the part with
 * decisions in it. Where the recorded series breaks, where the projection is
 * anchored, and how wide the band is at that anchor are all claims about the
 * data; what Recharts then draws from the rows is the library's business. A
 * pure function is also testable without a layout, which an SVG is not.
 */

export interface TimeSeriesPoint {
  /** "YYYY-MM" — a label, never parsed for arithmetic. */
  month: string;
  /** Minor units, or null where the month could not be valued. */
  value: number | null;
  /** An estimate rather than a fact: drawn dashed, with the band. */
  projected?: boolean;
  low?: number | null;
  high?: number | null;
}

/** One row per month, in the shape Recharts reads series off. */
export interface TimeSeriesRow {
  month: string;
  /** Recorded value, or null — the null is what breaks the solid line. */
  actual: number | null;
  /** Projected value; also carries the anchor so the dash joins the history. */
  estimate: number | null;
  /** The ±1σ envelope as `[low, high]`, which is Recharts' range-area shape. */
  range: [number, number] | null;
}

/**
 * Points to rows, with the projection anchored to the last valued month.
 *
 * The two series are kept apart on purpose: a recorded month never carries an
 * `estimate` and a projected month never carries an `actual`, so the solid and
 * dashed lines cannot be confused for one another by anything downstream.
 *
 * The one deliberate overlap is the anchor. The last month the server could
 * actually value gets an `estimate` equal to its own `actual`, and a `range`
 * of zero width there — a forecast has no spread at the figure it departs
 * from. Without it the dashed line would float detached from the history it
 * extends, and a single-month forecast would be one unconnected point.
 */
export function toRows(points: TimeSeriesPoint[]): TimeSeriesRow[] {
  const rows: TimeSeriesRow[] = points.map((point) =>
    point.projected
      ? {
          month: point.month,
          actual: null,
          estimate: point.value,
          range:
            point.low == null || point.high == null
              ? null
              : [point.low, point.high],
        }
      : {
          month: point.month,
          actual: point.value,
          estimate: null,
          range: null,
        },
  );

  // Searched from the end and skipping unvalued months: the estimate must
  // depart from a figure that exists, not from a gap that happens to sit last.
  const anchor = rows.findLastIndex(
    (row) => row.actual !== null && row.estimate === null,
  );

  if (anchor !== -1 && rows.some((row) => row.estimate !== null)) {
    const value = rows[anchor].actual!;
    rows[anchor] = { ...rows[anchor], estimate: value, range: [value, value] };
  }

  return rows;
}
