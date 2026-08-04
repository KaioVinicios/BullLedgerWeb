import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { MoneyValue } from "@/components/MoneyValue";
import { COST_BASIS_METHOD_BY_COUNTRY } from "@/schemas/apiEnums";
import type { Account } from "@/services/accounts";
import {
  contributionLimitsQuery,
  findLimit,
} from "@/services/contributionLimits";
import type { HoldingDetail } from "@/services/portfolio";

/**
 * Why this holding's basis was computed the way it was, and what the tax code
 * records about the account it sits in.
 *
 * Both blocks are **information only**. The cost-basis method is a *statement*
 * from `business-rules.md`, not a computation — the figure itself always comes
 * from the server. And nothing here is ever framed as tax owed: the API stores
 * tax attributes and never applies a rate, which is a v1 boundary rather than
 * a preference.
 */
export function TaxContext({
  holding,
  account,
}: {
  holding: HoldingDetail;
  account: Account;
}) {
  const { t } = useTranslation("app");

  const method = COST_BASIS_METHOD_BY_COUNTRY[account.country];

  // Page 1 only. `GET /api/contribution-limits/` declares no `registration`
  // and no `year` filter, so there is no way to ask for the single row this
  // needs; with eleven registrations against a page size of 50, every
  // current-year row lands on the first page. If that ever stops holding, the
  // block renders without the limit rather than with a wrong one —
  // `docs/backend-requests/2026-08-03-reporting.md` asks for the filter.
  const year = new Date().getFullYear();
  const limits = useQuery(contributionLimitsQuery({ page: 1 }));
  const limit = limits.data
    ? findLimit(limits.data.results, holding.registration, year)
    : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section
        aria-labelledby="holding-basis-title"
        className="space-y-3 rounded-xl border p-4"
      >
        <h2 id="holding-basis-title" className="text-sm font-medium">
          {t("holding.basis.title")}
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {t("holding.basis.method")}
            </dt>
            <dd className="font-medium">
              {t(`enums.costBasisMethod.${method}`)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t("holding.basis.explanation")}
        </p>
      </section>

      <section
        aria-labelledby="holding-tax-title"
        className="space-y-3 rounded-xl border p-4"
      >
        <h2 id="holding-tax-title" className="text-sm font-medium">
          {t("holding.tax.title")}
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {t("holding.tax.registration")}
            </dt>
            <dd className="font-medium">
              {t(`enums.registration.${holding.registration}`)}
            </dd>
          </div>

          {holding.tax_advantaged !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("holding.tax.advantaged")}
              </dt>
              <dd className="font-medium">
                {t(
                  holding.tax_advantaged
                    ? "holding.tax.advantagedYes"
                    : "holding.tax.advantagedNo",
                )}
              </dd>
            </div>
          )}

          {account.contribution_room && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("holding.tax.room")}</dt>
              <dd>
                <MoneyValue value={account.contribution_room} />
              </dd>
            </div>
          )}

          {limit && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("holding.tax.limit", { year })}
              </dt>
              <dd>
                <MoneyValue value={limit.limit} />
              </dd>
            </div>
          )}
        </dl>

        {/* Said out loud, on the screen that carries the numbers most likely
            to be mistaken for a tax position. */}
        <p className="text-xs text-muted-foreground">
          {t("holding.tax.disclaimer")}
        </p>
      </section>
    </div>
  );
}
