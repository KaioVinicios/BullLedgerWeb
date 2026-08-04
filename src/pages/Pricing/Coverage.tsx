/**
 * Which holdings the server could not value, and what the user can do about
 * each.
 *
 * The two reasons get opposite treatments, because one is actionable and the
 * other is not. `NO_QUOTE` is a price the user can record, so every row
 * carries the link that records it. `NO_FX` is a rate in a table that is
 * global to the API and writable only by staff — a button there would be a
 * control that cannot work, so this states the situation and points at the
 * table instead.
 */
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconAlertTriangle, IconCheck, IconRefresh } from "@tabler/icons-react";

import { UnpricedNote } from "@/components/UnpricedNote";
import { Button } from "@/components/ui/button";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { PortfolioOverview } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";

export function Coverage({
  overview,
  isPending,
  error,
  onRetry,
  assets,
  accounts,
}: {
  overview: PortfolioOverview | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  assets: readonly Asset[];
  accounts: readonly Account[];
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  // Silent while it loads: this block is conditional, and reserving space for
  // something that may not exist is a promise the screen cannot keep.
  if (isPending) return null;

  // Silence on failure would let the screen *imply* that nothing is missing.
  // The truth is that it does not know, and saying so is the whole rule.
  if (error) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3"
      >
        <IconAlertTriangle
          aria-hidden
          className="size-4 text-muted-foreground"
        />
        <p className="text-sm text-muted-foreground">
          {t("pricing.coverage.unknown")}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <IconRefresh aria-hidden />
          {t("structure.retry")}
        </Button>
      </div>
    );
  }

  if (!overview) return null;

  const nameOf = (
    rows: ReadonlyArray<{ id: string; name: string }>,
    id: string | null,
  ) => (id ? (rows.find((row) => row.id === id)?.name ?? "—") : "—");

  // A row with no asset names no asset to price, so it gets no button.
  const unpriced = overview.missing.filter(
    (row) => row.reason === "NO_QUOTE" && row.asset !== null,
  );
  const unconverted = overview.missing.filter((row) => row.reason === "NO_FX");

  if (unpriced.length === 0 && unconverted.length === 0) {
    // Absence of a warning is not the same as confirmation, and `complete` is
    // what tells the two apart — so the good path gets said out loud.
    return overview.complete ? (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconCheck aria-hidden className="size-4" />
        {t("pricing.coverage.complete", {
          date: formatCalendarDate(overview.on_date as CalendarDate, locale),
        })}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-4">
      {unpriced.length > 0 && (
        <section
          aria-labelledby="coverage-title"
          className="space-y-3 rounded-xl border p-4"
        >
          <div className="space-y-1">
            <h2 id="coverage-title" className="text-sm font-medium">
              {t("pricing.coverage.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("pricing.coverage.description")}
            </p>
          </div>
          <ul className="space-y-2">
            {unpriced.map((row) => (
              <li
                key={`${row.account}-${row.asset}`}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-sm">
                  {nameOf(assets, row.asset)}
                  <span className="text-muted-foreground">
                    {" · "}
                    {nameOf(accounts, row.account)}
                  </span>
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to={PATHS.PRICING_NEW}
                    search={{ asset: row.asset ?? undefined }}
                  >
                    {t("pricing.coverage.priceIt")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unconverted.length > 0 && (
        <section
          aria-labelledby="coverage-fx-title"
          className="space-y-3 rounded-xl border border-dashed p-4"
        >
          <div className="space-y-1">
            <h2 id="coverage-fx-title" className="text-sm font-medium">
              {t("pricing.coverage.noFxTitle")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("pricing.coverage.noFxDescription")}
            </p>
          </div>
          <ul className="space-y-1">
            {unconverted.map((row) => (
              <li key={`${row.account}-${row.asset ?? "cash"}`}>
                <UnpricedNote
                  reason="NO_FX"
                  subject={`${nameOf(assets, row.asset)} · ${nameOf(accounts, row.account)}`}
                />
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm">
            <Link to={PATHS.PRICING_FX}>{t("pricing.coverage.seeRates")}</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
