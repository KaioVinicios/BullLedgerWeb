import { Link } from "@tanstack/react-router";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedPercent } from "@/components/SignedPercent";
import { UnpricedNote } from "@/components/UnpricedNote";
import { TableCell, TableRow } from "@/components/ui/table";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { Asset } from "@/services/assets";
import type { HoldingSummary, MissingFigure } from "@/services/portfolio";
import { formatDecimal, SCALE } from "@/utils/decimal";

/**
 * One holding, and the only way into its detail — the API publishes no
 * holdings-list endpoint, so this row is the entry point.
 *
 * A holding the server could not value renders `UnpricedNote` **in place of the
 * figure, never a zero**: a zero would read as a real balance of nothing, and
 * the position is unknown rather than empty. The reason is the server's own,
 * looked up from the overview's `missing[]`.
 */
export function HoldingRow({
  holding,
  asset,
  reason,
}: {
  holding: HoldingSummary;
  asset: Asset | undefined;
  reason: MissingFigure["reason"] | null;
}) {
  const locale = useFormatLocale();

  const name = asset?.name ?? "—";
  const unvalued = holding.value === null || !holding.complete;

  return (
    <TableRow>
      <TableCell>
        <Link
          to={PATHS.HOLDING_DETAIL}
          params={{ accountId: holding.account, assetId: holding.asset }}
          className="font-medium underline-offset-4 hover:underline"
        >
          {name}
        </Link>
      </TableCell>

      <TableCell className="text-right font-mono text-sm tabular-nums">
        {/* Null is legitimate: a lump-principal FIXED_INCOME position has no
            unit count at all. */}
        {holding.quantity === null
          ? "—"
          : formatDecimal(holding.quantity, locale, SCALE.quantity)}
      </TableCell>

      <TableCell className="text-right">
        {unvalued ? (
          <UnpricedNote reason={reason ?? "NO_QUOTE"} />
        ) : (
          <MoneyValue value={holding.value!} />
        )}
      </TableCell>

      <TableCell className="text-right">
        {/* A return with no value behind it is genuinely unknown, which is a
            different thing from a missing price — so it gets the em dash and
            not the note. */}
        {holding.total_return === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <SignedPercent value={holding.total_return} />
        )}
      </TableCell>
    </TableRow>
  );
}
