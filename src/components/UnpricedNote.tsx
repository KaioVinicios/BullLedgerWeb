import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { MissingFigure } from "@/services/portfolio";

/**
 * What a value looks like when the server could not produce one.
 *
 * It never renders a number, and specifically never a zero: a holding with no
 * price has an *unknown* value, and a zero would read as a real balance of
 * nothing. The reason is the server's own — `NO_QUOTE` or `NO_FX` — never a
 * judgment made here.
 *
 * One caller in Phase 7 (the coverage block's missing-rate note), and that is
 * a deliberate cost. Phase 8 puts a figure on every screen it builds, and it
 * must inherit one way of saying "there isn't one" rather than invent a
 * second.
 */
export function UnpricedNote({
  reason,
  subject,
}: {
  reason: MissingFigure["reason"];
  subject?: string;
}) {
  const { t } = useTranslation("app");

  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
      <IconAlertCircle
        aria-hidden
        className="size-4 shrink-0 translate-y-0.5"
      />
      <span>
        {t(`enums.missingReason.${reason}`)}
        {subject ? ` — ${subject}` : null}
      </span>
    </span>
  );
}
