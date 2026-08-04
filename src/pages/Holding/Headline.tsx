import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { SignedFigure } from "@/components/SignedFigure";
import { SignedPercent } from "@/components/SignedPercent";
import { UnpricedNote } from "@/components/UnpricedNote";
import { PATHS } from "@/routes/path";
import type { HoldingDetail } from "@/services/portfolio";

/**
 * The five figures the reporting currency can express, led by the value.
 *
 * Only five of the holding's figures have a reporting form — `HoldingReporting`
 * carries value, invested, realized, unrealized, and income, and nothing else.
 * Cost basis, costs, and principal exist only in the native and base
 * currencies, which is why `FigureTable` is not optional beneath this.
 *
 * Per `PRODUCT.md`'s first principle the figures own the hierarchy: each label
 * sits *beneath* its number rather than above it.
 */
export function Headline({ holding }: { holding: HoldingDetail }) {
  const { t } = useTranslation("app");
  const { reporting } = holding;

  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      <Figure label={t("holding.headline.value")} lead>
        {reporting.value ? (
          <MoneyValue value={reporting.value} className="text-3xl" />
        ) : (
          <UnpricedNote reason="NO_QUOTE" />
        )}
      </Figure>

      <Figure label={t("holding.headline.unrealized")}>
        {reporting.unrealized_gain ? (
          <SignedFigure value={reporting.unrealized_gain} className="text-xl" />
        ) : (
          <UnpricedNote reason="NO_QUOTE" />
        )}
      </Figure>

      <Figure label={t("holding.headline.realized")}>
        {reporting.realized_gain ? (
          <SignedFigure value={reporting.realized_gain} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure label={t("holding.headline.invested")}>
        {reporting.invested ? (
          <MoneyValue value={reporting.invested} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure label={t("holding.headline.income")}>
        {reporting.income_received ? (
          <MoneyValue value={reporting.income_received} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure label={t("holding.headline.totalReturn")}>
        {holding.total_return ? (
          <SignedPercent value={holding.total_return} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      {/* Layered beside the nominal figures, never replacing one. A null
          `real_return` means no inflation reference is set — a setting the
          user controls, so the screen points at it rather than hiding the
          slot behind an em dash that explains nothing. */}
      <Figure label={t("holding.headline.realReturn")}>
        {holding.real_return ? (
          <SignedPercent value={holding.real_return} className="text-xl" />
        ) : (
          <Link
            to={PATHS.PROFILE}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("holding.setInflation")}
          </Link>
        )}
      </Figure>
    </div>
  );
}

function Figure({
  label,
  lead = false,
  children,
}: {
  label: string;
  /** The one figure the screen is answering; everything else supports it. */
  lead?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className={lead ? "text-3xl" : "text-xl"}>{children}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
