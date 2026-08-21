import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { InfoHint } from "@/components/InfoHint";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { movementsForHoldingQuery } from "@/services/movements";
import { movementTypesQuery } from "@/services/movementTypes";
import { holdingQuery } from "@/services/portfolio";
import { formatCalendarDate, toCalendarDate } from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";
import { toInstances } from "@/utils/instances";
import { formatUnitPrice, type Currency } from "@/utils/money";

/**
 * The purchases still inside one position, each with its own date and price.
 *
 * **The only on-demand read on this screen, and it mounts only when a row is
 * expanded.** Everything else here re-hangs one cached response; this issues
 * two per position, so the parent renders it conditionally rather than passing
 * an `enabled` flag — an unexpanded position must cost nothing at all.
 *
 * Two reads, because neither answers alone. The projection knows what is *left*
 * of each lot, which the server derives by walking the consumption. The
 * movement log knows what the lot cost and when, in stored columns the lot
 * never carries. `toInstances` joins them on `movement.lot`.
 *
 * A failure here is one position's, not the screen's: it retries in place and
 * the rest of the page keeps its figures.
 */
export function InstanceRows({
  accountId,
  assetId,
  currency,
}: {
  accountId: string;
  assetId: string;
  currency: Currency | undefined;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  const detail = useQuery(holdingQuery(accountId, assetId));
  const movements = useQuery(movementsForHoldingQuery(accountId, assetId));
  const specs = useQuery(movementTypesQuery);

  const failed = detail.error ?? movements.error ?? specs.error;

  if (failed) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {t("holdings.instances.error")}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void detail.refetch();
            void movements.refetch();
            void specs.refetch();
          }}
        >
          {t("holdings.instances.retry")}
        </Button>
      </div>
    );
  }

  // Checked on the data rather than on `isPending`, which narrows nothing:
  // three separate queries mean three separate `data | undefined`.
  if (!detail.data || !movements.data || !specs.data) {
    // A skeleton, not a spinner: the reader is mid-task and the shape of what
    // is coming is more use than the fact that something is.
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const instances = toInstances(detail.data.lots, movements.data, specs.data);

  if (instances.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        {t("holdings.instances.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("holdings.instances.columns.openedOn")}</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-0.5">
                {t("holdings.instances.columns.quantity")}
                <InfoHint metric="lot.quantity_remaining" />
              </span>
            </TableHead>
            <TableHead className="text-right">
              {t("holdings.instances.columns.unitPrice")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => {
            const on =
              instance.openedOn === null
                ? null
                : toCalendarDate(instance.openedOn);

            return (
              <TableRow key={instance.lot.lot}>
                <TableCell>
                  {on === null ? (
                    <span className="text-muted-foreground">
                      {t("holdings.instances.undated")}
                    </span>
                  ) : (
                    formatCalendarDate(on, locale)
                  )}
                </TableCell>

                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {instance.lot.quantity_remaining === null
                    ? "—"
                    : formatDecimal(
                        instance.lot.quantity_remaining,
                        locale,
                        SCALE.quantity,
                      )}
                </TableCell>

                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {instance.unitPrice === null || currency === undefined ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatUnitPrice(instance.unitPrice, currency, locale)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
