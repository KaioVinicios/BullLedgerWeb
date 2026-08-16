// Inline link styling shared across the auth pages: underline on hover and on
// keyboard focus, plus a visible focus ring so the target is never ambiguous.
export const authLink =
  "text-primary-emphasis font-medium underline-offset-4 outline-none hover:underline focus-visible:underline rounded-xs focus-visible:ring-3 focus-visible:ring-ring";

/**
 * The quiet variant: same affordances, neutral ramp.
 *
 * For a link that must stay reachable without competing — one sitting on the
 * path to a primary action rather than beside it. The accent is spent on the
 * primary action and the current selection (PRODUCT.md, "One accent, spent
 * deliberately"), and password recovery is neither; in gold, 16px, beside a
 * 14px form, it outshouted the Sign in button 30px below it.
 *
 * Carries its own `text-sm` because the size was the other half of that bug:
 * `authLink` sets no size, so a link outside a sized context silently inherits
 * the 16px page base while every label around it is 14px.
 */
export const authLinkQuiet =
  "text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline rounded-xs focus-visible:ring-3 focus-visible:ring-ring";
