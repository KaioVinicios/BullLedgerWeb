import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedPercent } from "@/components/SignedPercent";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { PortfolioOverview } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";

/**
 * The figures the user opened the app for.
 *
 * Per `PRODUCT.md`'s first principle the numbers own the hierarchy: the total
 * is the largest thing on the screen, and every label sits *beneath* its figure
 * rather than above it, so a glance lands on the value and not on the word for
 * it.
 */
export function Totals({ overview }: { overview: PortfolioOverview }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <Figure label={t("overview.totalValue")}>
          <MoneyValue value={overview.total_value} className="text-4xl" />
        </Figure>

        <Figure label={t("overview.nominalReturn")}>
          {overview.nominal_return ? (
            <SignedPercent
              value={overview.nominal_return}
              className="text-xl"
            />
          ) : (
            <span className="text-xl text-muted-foreground">—</span>
          )}
        </Figure>

        {/* Layered beside the nominal figure, never replacing it. Null means
            no inflation reference is set — a setting the user controls, so the
            slot names the setting instead of showing an em dash that explains
            nothing. */}
        <Figure label={t("overview.realReturn")}>
          {overview.real_return ? (
            <SignedPercent value={overview.real_return} className="text-xl" />
          ) : (
            <Link
              to={PATHS.PROFILE}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("overview.setInflation")}
            </Link>
          )}
        </Figure>

        <Figure label={t("overview.freeCash")}>
          <MoneyValue value={overview.free_cash} className="text-xl" />
        </Figure>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t("overview.valuedOn", {
            date: formatCalendarDate(overview.on_date as CalendarDate, locale),
          })}
        </span>

        {/* Never silently short. A total that omits a holding says so, and
            points at the one screen that can fix it. */}
        {!overview.complete && (
          <>
            <span>
              {t("overview.incomplete", { count: overview.missing.length })}
            </span>
            <Link
              to={PATHS.PRICING}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("overview.seePricing")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div>{children}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
