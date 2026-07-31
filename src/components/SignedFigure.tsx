import { useTranslation } from "react-i18next";

import { useFormatLocale } from "@/hooks/useFormatLocale";
import { cn } from "@/lib/utils";
import { formatMoney, type Money } from "@/utils/money";

interface SignedFigureProps {
  value: Money;
  /** See `MoneyValue`: an override, not a requirement. */
  locale?: string;
  className?: string;
}

/**
 * A figure that moved: a gain, a loss, or neither.
 *
 * Three signals carry the direction, and colour is the weakest of them. The
 * sign is always rendered, so the meaning survives a monochrome display, a
 * red-green colour deficiency, and a printout; the direction word reaches
 * assistive technology, which cannot see the sign's colour at all. Colour
 * only confirms what the sign already said — the WCAG 2.1 AA bar in
 * PRODUCT.md, and the reason `--gain` and `--loss` are matched in contrast
 * rather than tuned for drama.
 *
 * Zero is neither direction. A holding that has not moved is a fact, not a
 * failure, so it gets no sign, no colour, and no word.
 */
export function SignedFigure({ value, locale, className }: SignedFigureProps) {
  const { t } = useTranslation();
  const activeLocale = useFormatLocale();

  const { amount, currency } = value;
  const direction = Math.sign(amount);

  // Format the magnitude and own the sign, so `+` and `-` are symmetrical
  // and neither depends on what a locale's formatter chooses to emit.
  const magnitude = formatMoney(
    { amount: Math.abs(amount), currency },
    locale ?? activeLocale,
  );

  const sign = direction > 0 ? "+" : direction < 0 ? "-" : "";
  const label = direction > 0 ? t("figure.gain") : t("figure.loss");
  const tone = direction > 0 ? "text-gain" : "text-loss";

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        direction !== 0 && tone,
        className,
      )}
    >
      {sign}
      {magnitude}
      {direction !== 0 && <span className="sr-only"> {label}</span>}
    </span>
  );
}
