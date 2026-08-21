import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { InfoHint } from "@/components/InfoHint";
import { MoneyValue } from "@/components/MoneyValue";
import { SignedFigure } from "@/components/SignedFigure";
import { SignedPercent } from "@/components/SignedPercent";
import { UnpricedNote } from "@/components/UnpricedNote";
import { PATHS } from "@/routes/path";
import type { ExplainMetric } from "@/i18n/explain";
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
      <Figure
        label={t("holding.headline.value")}
        metric="holding.current_value"
        lead
      >
        {reporting.value ? (
          <MoneyValue value={reporting.value} className="text-3xl" />
        ) : (
          <UnpricedNote reason="NO_QUOTE" />
        )}
      </Figure>

      <Figure
        label={t("holding.headline.unrealized")}
        metric="holding.unrealized_gain"
      >
        {reporting.unrealized_gain ? (
          <SignedFigure value={reporting.unrealized_gain} className="text-xl" />
        ) : (
          <UnpricedNote reason="NO_QUOTE" />
        )}
      </Figure>

      <Figure
        label={t("holding.headline.realized")}
        metric="holding.realized_gain"
      >
        {reporting.realized_gain ? (
          <SignedFigure value={reporting.realized_gain} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure label={t("holding.headline.invested")} metric="holding.invested">
        {reporting.invested ? (
          <MoneyValue value={reporting.invested} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure
        label={t("holding.headline.income")}
        metric="holding.income_received"
      >
        {reporting.income_received ? (
          <MoneyValue value={reporting.income_received} className="text-xl" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Figure>

      <Figure
        label={t("holding.headline.totalReturn")}
        metric="holding.total_return"
      >
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
      <Figure
        label={t("holding.headline.realReturn")}
        metric="holding.real_return"
      >
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
  metric,
  lead = false,
  children,
}: {
  label: string;
  metric?: ExplainMetric;
  /** The one figure the screen is answering; everything else supports it. */
  lead?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className={lead ? "text-3xl" : "text-xl"}>{children}</div>
      {/* With the label, never with the number: the figures own the
          hierarchy, and an icon beside one would be the only chrome
          competing with it. */}
      <p className="flex items-center gap-0.5 text-xs text-muted-foreground">
        {label}
        {metric && <InfoHint metric={metric} />}
      </p>
    </div>
  );
}
