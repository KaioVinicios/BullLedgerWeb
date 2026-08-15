/**
 * The correction screen, which is also the movement's detail view — the Phase 5
 * precedent that a resource's edit form is where you go to look at it.
 *
 * Two states render read-only, both because the server would refuse the write
 * and offering a control that cannot work is worse than not offering it:
 * a movement already voided (`movement_already_voided`), and one leg of a
 * transfer (`movement_transfer_not_replaceable`), where the way forward is to
 * void the pair and record it again.
 */
import type { ReactNode } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconBan } from "@tabler/icons-react";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { SignedFigure } from "@/components/SignedFigure";
import { VoidConfirmDialog } from "@/components/VoidConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { useVoidMovement } from "@/hooks/useVoidMovement";
import { MovementForm } from "@/pages/Ledger/MovementForm";
import { PATHS } from "@/routes/path";
import { labelAccountById } from "@/utils/accountLabel";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import {
  isTransferLeg,
  movementQuery,
  type Movement,
} from "@/services/movements";
import {
  formatCalendarDate,
  formatInstant,
  type CalendarDate,
} from "@/utils/date";
import { formatDecimal, SCALE } from "@/utils/decimal";
import { formatMoney, formatUnitPrice } from "@/utils/money";

const route = getRouteApi(PATHS.LEDGER_CORRECT);

export function MovementCorrectPage() {
  const { t } = useTranslation("app");
  const { id } = route.useParams();
  const { data: movement } = useSuspenseQuery(movementQuery(id));

  const readOnly = movement.voided_at !== null || isTransferLeg(movement);

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("ledger.form.correctTitle")}
        description={t("ledger.form.correctDescription")}
      />

      {readOnly ? (
        <ReadOnlyMovement movement={movement} />
      ) : (
        <>
          {/*
            Said before the write rather than after it: recording a correction
            voids the original and writes a successor linked to it.
          */}
          <p className="text-sm text-muted-foreground">
            {t("ledger.correct.banner")}
          </p>
          <MovementForm movement={movement} />
        </>
      )}
    </PageContainer>
  );
}

function ReadOnlyMovement({ movement }: { movement: Movement }) {
  const { t } = useTranslation("app");
  const locale = useFormatLocale();
  const navigate = useNavigate();
  const voiding = useVoidMovement(() => void navigate({ to: PATHS.LEDGER }));

  const live = {} as const;
  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(live),
    queryFn: () => listAccounts(live),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(live),
    queryFn: () => listAssets(live),
  });

  const nameOf = (
    rows: ReadonlyArray<{ id: string; name: string }> | undefined,
    id: string | null,
  ) => (id ? (rows?.find((row) => row.id === id)?.name ?? "—") : "—");

  const voidedAt = movement.voided_at;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {voidedAt !== null
          ? t("ledger.correct.readOnlyVoided", {
              date: formatInstant(voidedAt, locale),
            })
          : t("ledger.correct.readOnlyTransferLeg")}
      </p>

      <Card>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact label={t("ledger.columns.type")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {t(`enums.movementType.${movement.type}`)}
                </Badge>
                {voidedAt !== null && (
                  <Badge variant="outline">{t("ledger.voidedBadge")}</Badge>
                )}
              </div>
            </Fact>
            <Fact label={t("ledger.columns.date")}>
              {formatCalendarDate(movement.occurred_on as CalendarDate, locale)}
            </Fact>
            <Fact label={t("ledger.columns.account")}>
              {labelAccountById(accounts?.results, movement.account, t)}
            </Fact>
            <Fact label={t("ledger.columns.asset")}>
              {nameOf(assets?.results, movement.asset)}
            </Fact>
            {movement.quantity_delta !== null && (
              <Fact label={t("ledger.columns.quantity")}>
                {formatDecimal(movement.quantity_delta, locale, SCALE.quantity)}
              </Fact>
            )}
            {movement.unit_price !== null && (
              <Fact label={t("ledger.form.unitPrice")}>
                {formatUnitPrice(
                  movement.unit_price,
                  movement.cash_delta.currency,
                  locale,
                )}
              </Fact>
            )}
            <Fact label={t("ledger.columns.amount")}>
              <SignedFigure value={movement.cash_delta} />
            </Fact>
            {movement.fee !== null && (
              <Fact label={t("ledger.form.fee")}>
                {formatMoney(movement.fee, locale)}
              </Fact>
            )}
            {movement.fx_rate !== null && (
              <Fact label={t("ledger.form.fxRate")}>
                {formatDecimal(movement.fx_rate, locale, SCALE.rate)}
              </Fact>
            )}
            {movement.note !== "" && (
              <Fact label={t("ledger.form.note")}>{movement.note}</Fact>
            )}
            <Fact label={t("ledger.correct.recorded")}>
              {formatInstant(movement.created_at, locale)}
            </Fact>
            {voidedAt !== null && (
              <Fact label={t("ledger.correct.voidedOn")}>
                {formatInstant(voidedAt, locale)}
              </Fact>
            )}
            {movement.replaces !== null && (
              <Fact label={t("ledger.corrects")}>
                <Link
                  to={PATHS.LEDGER_CORRECT}
                  params={{ id: movement.replaces }}
                  className="underline underline-offset-4"
                >
                  {t("ledger.correct.openOriginal")}
                </Link>
              </Fact>
            )}
          </dl>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button asChild variant="ghost">
            <Link to={PATHS.LEDGER}>{t("ledger.backToLedger")}</Link>
          </Button>
          {/* A voided row has nothing left to withdraw; a transfer leg does,
              and voiding the pair is the only way to record it again. */}
          {voidedAt === null && (
            <Button onClick={() => voiding.ask(movement)}>
              <IconBan aria-hidden />
              {t("ledger.void.action")}
            </Button>
          )}
        </CardFooter>
      </Card>

      <VoidConfirmDialog {...voiding.dialogProps} />
    </>
  );
}

/** One recorded fact: what it is called, and what it was. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}
