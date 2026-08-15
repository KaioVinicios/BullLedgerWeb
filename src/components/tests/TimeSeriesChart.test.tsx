/**
 * The chart's own decisions, and only those.
 *
 * The drawing is Recharts' work now, so asserting on emitted path geometry
 * would test the library rather than our code. What is ours is the shaping in
 * `utils/timeSeries.ts` — where the series breaks, where the projection is
 * anchored, how the band collapses at that anchor — so that is asserted
 * directly, against a pure function that needs no layout to run.
 *
 * Two rendering checks remain, and both are contract rather than appearance:
 * the chart is hidden from assistive technology, and it survives a series with
 * nothing drawable in it.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { toRows, type TimeSeriesPoint } from "@/utils/timeSeries";

const points = (values: (number | null)[]): TimeSeriesPoint[] =>
  values.map((value, index) => ({
    month: `2026-0${index + 1}`,
    value,
  }));

describe("toRows", () => {
  it("breaks the recorded series at a month it could not value", () => {
    // A null is not zero and not a straight line across: the server declined
    // to compute it, so the series declines too and `connectNulls` is off.
    const rows = toRows(points([10, null, 30]));

    expect(rows.map((row) => row.actual)).toEqual([10, null, 30]);
  });

  it("keeps the estimate out of the recorded series, and vice versa", () => {
    const rows = toRows([
      { month: "2026-01", value: 10 },
      { month: "2026-02", value: 20 },
      { month: "2026-03", value: 30, projected: true, low: 25, high: 35 },
    ]);

    expect(rows[2].actual).toBeNull();
    expect(rows[2].estimate).toBe(30);
    expect(rows[2].range).toEqual([25, 35]);
  });

  it("anchors the projection at the last valued month, with no spread there", () => {
    // Without the anchor a one-month forecast is a single unconnected point,
    // and a longer one floats detached from the history it extends.
    const rows = toRows([
      { month: "2026-01", value: 10 },
      { month: "2026-02", value: 20 },
      { month: "2026-03", value: 30, projected: true, low: 25, high: 35 },
    ]);

    expect(rows[1].estimate).toBe(20);
    expect(rows[1].range).toEqual([20, 20]);
    // And it stays a recorded month: the solid line still reaches it.
    expect(rows[1].actual).toBe(20);
  });

  it("plants no anchor when there is nothing to project", () => {
    const rows = toRows(points([10, 20]));

    expect(rows.every((row) => row.estimate === null)).toBe(true);
    expect(rows.every((row) => row.range === null)).toBe(true);
  });

  it("skips an unvalued month when choosing the anchor", () => {
    // The projection must depart from a figure that exists, not from the gap
    // immediately before it.
    const rows = toRows([
      { month: "2026-01", value: 10 },
      { month: "2026-02", value: null },
      { month: "2026-03", value: 30, projected: true, low: 25, high: 35 },
    ]);

    expect(rows[1].estimate).toBeNull();
    expect(rows[0].estimate).toBe(10);
  });
});

describe("TimeSeriesChart", () => {
  it("is hidden from assistive technology", () => {
    /* The figures live in the table beside it; announcing a chart would
       duplicate them as noise. Same contract as AllocationBar. */
    const { container } = render(
      <TimeSeriesChart points={points([1, 2, 3])} />,
    );

    expect(container.querySelector("[data-slot='chart']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders without a drawable month rather than throwing", () => {
    const { container } = render(
      <TimeSeriesChart points={points([null, null])} />,
    );

    expect(container.querySelector("[data-slot='chart']")).toBeInTheDocument();
  });
});
