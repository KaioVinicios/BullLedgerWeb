import { useId } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { MoneyValue } from "@/components/MoneyValue";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoldingRow } from "@/components/HoldingRow";
import type { Asset } from "@/services/assets";
import type { AccountGroup, MissingFigure } from "@/services/portfolio";

/**
 * One account's block: its cash, its subtotal, and the holdings that make it up.
 *
 * Grouped because it mirrors how the payload arrives and how people think about
 * where money sits, and because it keeps an account's `cash` beside the rows it
 * totals. Expanded by default — the figures are the point, and hiding them
 * behind a click would put the holding detail two clicks from the front door.
 *
 * The disclosure is a real `<button aria-expanded>` controlling the row group,
 * never a clickable `<div>`, and the body is a real `<table>` so a screen reader
 * gets row and column context for free.
 */
export function AccountGroupBlock({
  group,
  name,
  isOpen,
  onToggle,
  assets,
  missing,
}: {
  group: AccountGroup;
  name: string;
  isOpen: boolean;
  onToggle: () => void;
  assets: readonly Asset[];
  missing: readonly MissingFigure[];
}) {
  const { t } = useTranslation("app");
  const titleId = useId();
  const bodyId = useId();

  const assetById = (id: string) => assets.find((row) => row.id === id);

  const reasonFor = (assetId: string) =>
    missing.find(
      (row) => row.account === group.account && row.asset === assetId,
    )?.reason ?? null;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {isOpen ? (
            <IconChevronDown aria-hidden className="size-4 shrink-0" />
          ) : (
            <IconChevronRight aria-hidden className="size-4 shrink-0" />
          )}
          <span id={titleId} className="font-medium">
            {name}
          </span>
          {!group.complete && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("overview.groupIncomplete")}
            </span>
          )}
        </button>

        <div className="flex items-center gap-6 text-sm">
          {group.cash && (
            <span className="text-muted-foreground">
              {t("overview.cash")}{" "}
              <MoneyValue value={group.cash} className="text-foreground" />
            </span>
          )}
          <MoneyValue value={group.subtotal} className="font-medium" />
        </div>
      </div>

      <div id={bodyId} hidden={!isOpen}>
        {group.holdings.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("overview.columns.asset")}</TableHead>
                  <TableHead className="text-right">
                    {t("overview.columns.quantity")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.columns.value")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.columns.return")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.columns.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.holdings.map((holding) => (
                  <HoldingRow
                    key={holding.asset}
                    holding={holding}
                    asset={assetById(holding.asset)}
                    reason={reasonFor(holding.asset)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
