import { useTranslation } from "react-i18next";

import {
  AllocationBar,
  type AllocationSegment,
} from "@/components/AllocationBar";
import { MoneyValue } from "@/components/MoneyValue";
import { PercentValue } from "@/components/PercentValue";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AllocationSlice } from "@/services/portfolio";
import type { Money } from "@/utils/money";

/**
 * One dimension's proportions: a bar over a table that carries every figure.
 *
 * The bar is decorative and hidden from assistive technology, so this table is
 * not a supplement to it — it *is* the content. Every slice therefore has to
 * name itself, state its value, and state its share here, whether or not
 * anyone can see the graphic.
 *
 * Sorted by weight descending rather than by the server's order, because a
 * proportion view answers "what is this mostly" first. A slice with no weight
 * sorts last: it has no share to compare.
 */
export function Dimension({
  slices,
  total,
  labelOf,
}: {
  slices: readonly AllocationSlice[];
  total: Money;
  /** Turns the server's bare `key` into a name in the reader's language. */
  labelOf: (key: string) => string;
}) {
  const { t } = useTranslation("app");

  const segments: AllocationSegment[] = slices
    .map((slice) => ({
      id: slice.key,
      label: labelOf(slice.key),
      value: slice.value,
      weight: slice.weight,
      complete: slice.complete,
    }))
    .sort((a, b) => {
      if (a.weight === null) return 1;
      if (b.weight === null) return -1;
      // Decimal strings of the same scale compare correctly as numbers here
      // only for ordering — never for display, which stays on the string.
      return Number(b.weight) - Number(a.weight);
    });

  return (
    <div className="space-y-4">
      <AllocationBar segments={segments} />

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("allocation.columns.category")}</TableHead>
              <TableHead className="text-right">
                {t("allocation.columns.value")}
              </TableHead>
              <TableHead className="text-right">
                {t("allocation.columns.weight")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow key={segment.id}>
                <TableCell>
                  {segment.label}
                  {!segment.complete && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("allocation.sliceIncomplete")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyValue value={segment.value} />
                </TableCell>
                <TableCell className="text-right">
                  {segment.weight === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <PercentValue value={segment.weight} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {/* The reconciliation: every dimension sums to the same total, and
              showing it is what lets a reader check the split rather than
              trust it. */}
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">
                {t("allocation.total")}
              </TableCell>
              <TableCell className="text-right font-medium">
                <MoneyValue value={total} />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
