/**
 * How a figure that moved is presented — one decision, in one place.
 *
 * `SignedFigure` renders signed Money and `SignedPercent` renders a signed
 * decimal-string rate. A gain has to read identically in both, and two copies
 * of this would drift the first time one of them was tuned. Same reasoning as
 * `shell/activeStyles.ts`: the vocabulary for a state belongs in one file.
 *
 * Three signals carry direction, and colour is the weakest of them. The sign is
 * always rendered, so the meaning survives a monochrome display, a red-green
 * colour deficiency, and a printout; the direction word reaches assistive
 * technology, which cannot see the sign's colour at all. Colour only confirms
 * what the sign already said — the WCAG 2.1 AA bar in `PRODUCT.md`, and the
 * reason `--gain` and `--loss` are matched in contrast rather than tuned for
 * drama.
 *
 * Zero is neither direction. A holding that has not moved is a fact, not a
 * failure, so it gets no sign, no colour, and no word.
 */
export interface SignedTone {
  sign: "+" | "-" | "";
  /** A Tailwind text colour, or null when there is no direction to tone. */
  tone: string | null;
  /** A key in the default namespace, or null. */
  labelKey: "figure.gain" | "figure.loss" | null;
}

/** `direction` is a sign: any positive, any negative, or zero. */
export function signedTone(direction: number): SignedTone {
  if (direction > 0)
    return { sign: "+", tone: "text-gain", labelKey: "figure.gain" };

  if (direction < 0)
    return { sign: "-", tone: "text-loss", labelKey: "figure.loss" };

  return { sign: "", tone: null, labelKey: null };
}
