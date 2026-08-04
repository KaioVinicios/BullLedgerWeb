import Big from "big.js";

/**
 * A slice's share of its dimension, as a CSS length.
 *
 * **The only arithmetic in Phase 8, and it is geometry rather than money.**
 * This result lands in a `style.width` and is never rendered as a figure —
 * every displayed percentage goes through `formatPercent`, which keeps the
 * decimal string intact all the way to `Intl`. Nobody should reach for this to
 * show a number: four places is a sub-pixel budget, not a precision claim.
 *
 * A null `weight` is not zero. The server sends null when it could not compute
 * a share — a zero total, or a slice it could not value — and a slice with no
 * basis must not claim space on the bar. The table beside the bar is where
 * that absence gets explained.
 */
export function weightToWidth(weight: string | null): string {
  if (weight === null) return "0%";

  const percent = new Big(weight).times(100);
  const clamped = percent.lt(0)
    ? new Big(0)
    : percent.gt(100)
      ? new Big(100)
      : percent;

  return `${clamped.toFixed(4)}%`;
}
