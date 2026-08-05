/**
 * One holding, in detail.
 *
 * Reached from the overview's rows and from nowhere else — the API publishes no
 * holdings-list endpoint, which is why there is no `/app/holdings` index for
 * this to sit under.
 *
 * Strictly a read. No mutation hook is imported here or in anything this
 * composes; instead of badging the screen "read-only", a line under the header
 * says where the figures come from and links to the log that produced them,
 * which explains the absence of controls rather than asserting it.
 *
 * `TargetBlock` links out to the target form when no target resolves, and that
 * does not weaken the rule: a `<Link>` to another route is not a write
 * affordance — no mutation hook, no form, no input enters this screen — which
 * is why `e2e/reporting-read-only.spec.ts` still passes unchanged. When a
 * target *does* resolve, the block states which level it came from and offers
 * no link at all: a screen whose premise is reading should not grow an edit
 * path to the thing it is reading.
 *
 * The projection carries bare UUIDs, so the account and asset are joined from
 * their own resources — that join is also what supplies the two currency codes
 * `FigureTable` collapses on.
 */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { FigureTable } from "@/pages/Holding/FigureTable";
import { Headline } from "@/pages/Holding/Headline";
import { TargetBlock } from "@/pages/Holding/TargetBlock";
import { TaxContext } from "@/pages/Holding/TaxContext";
import { PATHS } from "@/routes/path";
import { accountQuery } from "@/services/accounts";
import { assetQuery } from "@/services/assets";
import { holdingQuery } from "@/services/portfolio";
import { formatCalendarDate, type CalendarDate } from "@/utils/date";

const route = getRouteApi(PATHS.HOLDING_DETAIL);

export function HoldingPage() {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const { accountId, assetId } = route.useParams();

  const { data: holding } = useQuery(holdingQuery(accountId, assetId));
  const { data: account } = useQuery(accountQuery(accountId));
  const { data: asset } = useQuery(assetQuery(assetId));

  // The route's loader resolves the holding before this renders, so the only
  // pending case left is the two name reads, which the header degrades over.
  if (!holding) return null;

  return (
    <PageContainer>
      <PageHeader
        title={asset?.name ?? "—"}
        description={account?.name ?? undefined}
      />

      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">
            {t(`enums.archetype.${holding.archetype}`)}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("holding.valuedOn", {
              date: formatCalendarDate(holding.on_date as CalendarDate, locale),
            })}
          </span>
        </div>

        <Headline holding={holding} />

        {/* What makes the read-only-ness legible: where these came from, and
            the two ways back to the log that produced them.

            The lots link goes to Phase 6's own screen rather than repeating it
            here. `/app/ledger/lots` already reads this same projection and
            renders every `LotProjection` figure, and its URL takes exactly the
            account and asset this screen has — a second copy inside the
            holding would be one more table to keep in step for no new fact. */}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {t("holding.derivedNote")}
          <Link
            to={PATHS.LEDGER}
            search={{ account: accountId, asset: assetId }}
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
          >
            {t("holding.seeMovements")}
            <IconArrowRight aria-hidden className="size-3.5" />
          </Link>
          <Link
            to={PATHS.LEDGER_LOTS}
            search={{ account: accountId, asset: assetId }}
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
          >
            {t("holding.seeLots")}
            <IconArrowRight aria-hidden className="size-3.5" />
          </Link>
        </p>

        {asset && account && (
          <FigureTable
            holding={holding}
            nativeCurrency={asset.currency}
            baseCurrency={account.base_currency}
          />
        )}

        {account && (
          <TargetBlock holding={holding} accountName={account.name} />
        )}

        {account && <TaxContext holding={holding} account={account} />}
      </div>
    </PageContainer>
  );
}
