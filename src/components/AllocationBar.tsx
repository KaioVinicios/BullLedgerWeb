import { cn } from "@/lib/utils";
import { weightToWidth } from "@/utils/allocation";
import type { Money } from "@/utils/money";

export interface AllocationSegment {
  id: string;
  label: string;
  value: Money;
  /** Decimal-string fraction, or null where the server could not compute one. */
  weight: string | null;
  complete: boolean;
}

/**
 * Four steps of the gold ramp, cycled — `--chart-2` through `--chart-5`.
 *
 * Measured rather than eyeballed (oklch → linear sRGB → relative luminance;
 * the conversion reproduces the gold rail marker's recorded `#d08700` exactly,
 * which is what makes these figures trustworthy):
 *
 *   chart-1 #ffdf20   vs --muted: light 1.20:1   dark 11.26:1
 *   chart-2 #f0b100   vs --muted: light 1.74:1   dark  7.78:1
 *   chart-3 #d08700   vs --muted: light 2.66:1   dark  5.08:1
 *   chart-4 #a65f00   vs --muted: light 4.47:1   dark  3.02:1
 *   chart-5 #894b00   vs --muted: light 6.25:1   dark  2.17:1
 *
 * **`--chart-1` is excluded on the evidence**: at 1.20:1 over the light trough
 * it is effectively invisible in one of the two themes, and a segment nobody
 * can see is not a segment.
 *
 * **The gap, not the fill, is what separates segments.** Adjacent steps measure
 * only 1.40:1 to 1.68:1 against each other, which is well under the 3:1
 * non-text bar — no reordering of this ramp fixes that, because it is one hue
 * family by design (`PRODUCT.md`: one accent, spent deliberately; five
 * unrelated hues would be the crypto-dashboard anti-reference). So the boundary
 * is structural: a 2px gap showing the trough, which the eye reads as an edge
 * regardless of how close the two fills sit in luminance.
 *
 * Four steps across five archetypes also never puts a repeat next to itself:
 * the cycle lands 0,1,2,3,0 and positions 0 and 4 are not adjacent.
 */
const FILLS = ["bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;

/**
 * A dimension's proportions, as one bar.
 *
 * **Decorative, and marked as such.** Every label, value, and weight lives in
 * the table beside it, so the information is complete without the bar and no
 * category is ever distinguishable by fill alone — the WCAG 2.1 AA bar in
 * `PRODUCT.md`, and the reason this exists instead of a pie with a colour
 * legend. Being `aria-hidden` is also what exempts the fills from 1.4.11: the
 * bar states nothing the table does not.
 *
 * A slice the server could not weigh is dropped rather than given a zero-width
 * sliver (see `weightToWidth`), and a bar with nothing to show renders nothing
 * rather than an empty trough that would read as a real zero.
 */
export function AllocationBar({
  segments,
  className,
}: {
  segments: readonly AllocationSegment[];
  className?: string;
}) {
  const weighted = segments.filter((segment) => segment.weight !== null);
  if (weighted.length === 0) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {weighted.map((segment, index) => (
        <div
          key={segment.id}
          data-segment={segment.id}
          className={FILLS[index % FILLS.length]}
          style={{ width: weightToWidth(segment.weight) }}
        />
      ))}
    </div>
  );
}
