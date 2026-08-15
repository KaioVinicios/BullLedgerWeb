import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedPercent } from "@/components/SignedPercent";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { PATHS } from "@/routes/path";
import type { AccountGroup, PortfolioOverview } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";

/**
 * The figures the user opened the app for.
 *
 * Per `PRODUCT.md`'s first principle the numbers own the hierarchy: the total
 * is the largest thing on the screen, and every label sits *beneath* its figure
 * rather than above it, so a glance lands on the value and not on the word for
 * it.
 *
 * `group` names the scope. Absent is the whole portfolio; present means these
 * figures describe that one account, and without it an account's tab would
 * report the portfolio's total while claiming to be one account's — the
 * figures would contradict the tab above them.
 */
export function Totals({
  overview,
  group,
}: {
  overview: PortfolioOverview;
  group?: AccountGroup;
}) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();

  // One account's tab reports that account: its subtotal, its cash, and the
  // return over its own invested capital. `AccountGroup` carries all four, so
  // the scope changes which object is read and nothing else about this block.
  const total = group ? group.subtotal : overview.total_value;
  const cash = group ? group.cash : overview.free_cash;
  const nominal = group ? group.nominal_return : overview.nominal_return;
  const real = group ? group.real_return : overview.real_return;
  const complete = group ? group.complete : overview.complete;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <Figure label={t("overview.totalValue")}>
          <MoneyValue value={total} className="text-4xl" />
        </Figure>

        <Figure label={t("overview.nominalReturn")}>
          {nominal ? (
            <SignedPercent value={nominal} className="text-xl" />
          ) : (
            <span className="text-xl text-muted-foreground">—</span>
          )}
        </Figure>

        {/* Layered beside the nominal figure, never replacing it. Null means
            no inflation reference is set — a setting the user controls, so the
            slot names the setting instead of showing an em dash that explains
            nothing. */}
        <Figure label={t("overview.realReturn")}>
          {real ? (
            <SignedPercent value={real} className="text-xl" />
          ) : (
            <Link
              to={PATHS.PROFILE}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("overview.setInflation")}
            </Link>
          )}
        </Figure>

        {/* An account's cash is nullable where the portfolio's never is, so
            this slot takes the em dash the other nullable figures already
            get rather than printing a zero the server did not report. */}
        <Figure label={t("overview.freeCash")}>
          {cash ? (
            <MoneyValue value={cash} className="text-xl" />
          ) : (
            <span className="text-xl text-muted-foreground">—</span>
          )}
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
        {!complete && (
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
