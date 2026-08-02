/**
 * What the holding currently amounts to, beside a corporate action.
 *
 * A split is recorded as the **delta** it produced, not as the ratio that
 * produced it, because the delta is what the API stores and the ratio is what
 * a statement prints. Converting one into the other is the user's arithmetic —
 * a 3:1 on 15 units adds 30 — and this is the figure they need in front of
 * them to do it. Read from the projection, never computed here.
 *
 * Silent when the projection is unavailable: a position this cannot see is one
 * it must not guess at.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useFormatLocale } from "@/hooks/useFormatLocale";
import { holdingQuery } from "@/services/portfolio";
import { formatDecimal, SCALE } from "@/utils/decimal";

export function PositionHint({
  accountId,
  assetId,
}: {
  accountId: string;
  assetId: string;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  const { data } = useQuery({
    ...holdingQuery(accountId, assetId),
    enabled: Boolean(accountId && assetId),
  });

  if (!data?.quantity) return null;

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {t("ledger.form.position", {
        quantity: formatDecimal(data.quantity, locale, SCALE.quantity),
      })}
    </p>
  );
}
