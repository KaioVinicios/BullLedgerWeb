/**
 * How a select's trigger looks when its list has nothing in it.
 *
 * A Radix select with no items still opens — it portals a panel one line tall
 * with nothing inside, hovering over the trigger it came from. Disabling the
 * trigger is what stops that, and the trigger then has to say what it is
 * holding instead, because a control that is closed *and* silent is worse than
 * the blank panel it replaced.
 *
 * Which is where the base trigger's own `disabled:opacity-50` gets in the way.
 * On a genuinely disabled control that dimming is right; on this one it is
 * dimming the only sentence the field has left. Measured against
 * `--background`, `--muted-foreground` reads 4.83:1 in light and 7.56:1 in
 * dark — comfortably past AA — and at 50% it collapses to 1.98:1 and 2.64:1.
 * So the opacity is put back and the muted ramp carries the "unavailable"
 * signal on its own, alongside the inherited `disabled:cursor-not-allowed`.
 *
 * A constant rather than a wrapper component: the five hand-written selects in
 * Ledger keep their own markup, widths, and copy, and the only thing genuinely
 * shared between them is this contrast decision. It should have one owner.
 */
export const EMPTY_SELECT_TRIGGER =
  "bg-muted/40 shadow-none text-muted-foreground disabled:opacity-100 dark:bg-transparent! dark:hover:bg-transparent!";
