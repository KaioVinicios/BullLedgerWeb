/**
 * A transfer is two linked facts, so it is one form and one request.
 *
 * It cannot go through `MovementForm`: `POST /api/movements/` rejects
 * `TRANSFER_IN` and `TRANSFER_OUT` outright (`movement_use_record_transfer`),
 * because writing one leg without the other would leave a portfolio where value
 * left an account and arrived nowhere. `POST /api/movements/transfer/` writes
 * both atomically and pairs them through `transfer_of`.
 *
 * It is also a different question. There is no type to choose — the endpoint
 * decides both legs — no fee, and no unit price. What it asks instead is where
 * the value went, which no other screen in the ledger asks at all.
 */
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DecimalField } from "@/forms/DecimalField";
import { EMPTY_SELECT_TRIGGER } from "@/forms/emptySelect";
import { FieldError } from "@/forms/FieldError";
import { MoneyField } from "@/forms/MoneyField";
import { TextField } from "@/forms/TextField";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { LotSelect } from "@/pages/Ledger/LotSelect";
import { PATHS } from "@/routes/path";
import { acceptsQuantity, shapeFor, specFor } from "@/schemas/movementSpec";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import {
  invalidateLedger,
  recordTransfer,
  type TransferRequest,
} from "@/services/movements";
import { movementTypesQuery } from "@/services/movementTypes";
import { todayCalendarDate } from "@/utils/date";
import { INTEGER_DIGITS, parseDecimalInput, SCALE } from "@/utils/decimal";
import { parseMoneyInput, type Currency } from "@/utils/money";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Radix select values are strings; "no asset" needs one of its own. */
const NO_ASSET = "none";

/**
 * Both spellings again: the serializer rejects under `cash_amount`, the model's
 * `clean()` under `cash_amount_minor`, and a key no input claims lands in the
 * banner instead of on the field.
 */
const CLAIMED_FIELDS = [
  "source_account",
  "destination_account",
  "occurred_on",
  "asset",
  "quantity",
  "cash_amount",
  "cash_amount_minor",
  "source_lot",
  "note",
] as const;

type TransferFormValues = {
  source_account: string;
  destination_account: string;
  occurred_on: string;
  asset: string;
  quantity: string;
  amount: string;
  source_lot: string;
  note: string;
};

export function TransferForm() {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  // Resolved by the route's loader, so this never suspends on first render.
  const { data: specs } = useSuspenseQuery(movementTypesQuery);

  const live = {} as const;
  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(live),
    queryFn: () => listAccounts(live),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(live),
    queryFn: () => listAssets(live),
  });

  const accountRows = accounts?.results ?? [];
  const noAccounts = accountRows.length === 0;

  /**
   * The out leg's spec is what decides everything variable on this screen, so
   * the transfer's own rules come from the same table as every other movement's
   * — including which assets can be transferred at all.
   */
  const outSpec = specFor(specs, "TRANSFER_OUT");
  const transferable = (assets?.results ?? []).filter((asset) =>
    outSpec?.archetypes.includes(asset.archetype),
  );

  const shapeOf = (assetId: string) => {
    const archetype =
      transferable.find((asset) => asset.id === assetId)?.archetype ?? null;

    return outSpec ? shapeFor(outSpec, archetype) : null;
  };

  const currencyOf = (assetId: string, accountId: string): Currency =>
    transferable.find((asset) => asset.id === assetId)?.currency ??
    accountRows.find((row) => row.id === accountId)?.base_currency ??
    "BRL";

  const schema = z
    .object({
      source_account: z.string().min(1, t("ledger.form.errors.account")),
      destination_account: z
        .string()
        .min(1, t("ledger.transferForm.errors.destination")),
      occurred_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, t("ledger.form.errors.date")),
      asset: z.string(),
      quantity: z.string(),
      amount: z.string(),
      source_lot: z.string(),
      note: z.string(),
    })
    .superRefine((values, ctx) => {
      // `movement_transfer_same_account`, said before the request rather than
      // after: a transfer to itself is not a movement of anything.
      if (
        values.source_account !== "" &&
        values.source_account === values.destination_account
      ) {
        ctx.addIssue({
          code: "custom",
          message: t("ledger.transferForm.errors.sameAccount"),
          path: ["destination_account"],
        });
      }

      const shape = shapeOf(values.asset);
      if (!shape) return;

      if (acceptsQuantity(shape)) {
        if (
          parseDecimalInput(values.quantity, locale, SCALE.quantity) === null
        ) {
          ctx.addIssue({
            code: "custom",
            message: t("ledger.transferForm.errors.quantity"),
            path: ["quantity"],
          });
        }
      } else {
        const currency = currencyOf(values.asset, values.source_account);

        if (!parseMoneyInput(values.amount, currency, locale)) {
          ctx.addIssue({
            code: "custom",
            message: t("ledger.transferForm.errors.amount"),
            path: ["amount"],
          });
        }
      }

      // `movement_transfer_source_lot_required`: units leave a contribution,
      // and which one decides the basis that travels with them.
      if (values.asset !== "" && values.source_lot === "") {
        ctx.addIssue({
          code: "custom",
          message: t("ledger.form.errors.lot"),
          path: ["source_lot"],
        });
      }
    });

  const mutation = useMutation({
    mutationFn: (body: TransferRequest) => recordTransfer(body),
    onSuccess: async () => {
      await invalidateLedger(queryClient);
      toast.success(t("ledger.transferForm.recorded"));
      // Both legs are visible there, and linked to each other.
      void navigate({ to: PATHS.LEDGER });
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? claimFieldErrors(
              translateServerErrors(error, tError, locale),
              CLAIMED_FIELDS,
            )
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  // Annotated rather than inferred: `todayCalendarDate` returns a branded
  // string, and the form's own state is plain text the user is free to retype.
  const defaults: TransferFormValues = {
    source_account: "",
    destination_account: "",
    occurred_on: todayCalendarDate(),
    asset: "",
    quantity: "",
    amount: "",
    source_lot: "",
    note: "",
  };

  const form = useForm({
    defaultValues: defaults,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);

      const shape = shapeOf(value.asset);
      if (!shape) return;

      const currency = currencyOf(value.asset, value.source_account);
      const movesUnits = acceptsQuantity(shape);
      const cash = movesUnits
        ? null
        : parseMoneyInput(value.amount, currency, locale);

      const body: TransferRequest = {
        source_account: value.source_account,
        destination_account: value.destination_account,
        occurred_on: value.occurred_on,
        asset: value.asset === "" ? null : value.asset,
        quantity: movesUnits
          ? parseDecimalInput(value.quantity, locale, SCALE.quantity)
          : null,
        cash_amount: cash,
        source_lot: value.source_lot === "" ? null : value.source_lot,
        note: value.note.trim(),
      };

      try {
        await mutation.mutateAsync(body);
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  const accountField = (
    name: "source_account" | "destination_account",
    label: string,
  ) => (
    <form.Field key={name} name={name}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={`transfer-${name}`}>{label}</Label>
          <Select value={field.state.value} onValueChange={field.handleChange}>
            <SelectTrigger
              id={`transfer-${name}`}
              className={cn("w-full", noAccounts && EMPTY_SELECT_TRIGGER)}
              disabled={noAccounts}
              aria-describedby={
                noAccounts ? `transfer-${name}-hint` : undefined
              }
            >
              {noAccounts ? (
                <span className="min-w-0 truncate">
                  {t("ledger.form.accountEmpty")}
                </span>
              ) : (
                <SelectValue placeholder={t("ledger.form.account")} />
              )}
            </SelectTrigger>
            <SelectContent>
              {accountRows.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {noAccounts && (
            <p
              id={`transfer-${name}-hint`}
              className="text-xs text-muted-foreground"
            >
              {t("ledger.form.accountEmptyHint")}
            </p>
          )}
          <FieldError
            id={`transfer-${name}-error`}
            errors={[
              ...field.state.meta.errors,
              ...(serverErrors.fieldErrors[name] ?? []),
            ]}
          />
        </div>
      )}
    </form.Field>
  );

  return (
    <form
      noValidate
      aria-labelledby="transfer-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <span id="transfer-form-title" className="sr-only">
        {t("ledger.transferForm.title")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          {/*
            The domain rule the roadmap is explicit about, stated before the
            first field rather than after the fact: moving your own crypto
            between your own wallets is not a disposal.
          */}
          <p className="text-sm text-muted-foreground">
            {t("ledger.transferForm.basisNote")}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {accountField("source_account", t("ledger.transferForm.source"))}
            {accountField(
              "destination_account",
              t("ledger.transferForm.destination"),
            )}
          </div>

          <form.Field name="occurred_on">
            {(field) => (
              <TextField
                name="occurred_on"
                type="date"
                label={t("ledger.form.occurredOn")}
                hint={t("ledger.form.occurredOnHint")}
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.occurred_on ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [state.values.asset, state.values.source_account] as const
            }
          >
            {([assetId, sourceId]) => {
              const shape = shapeOf(assetId);
              const movesUnits = shape ? acceptsQuantity(shape) : false;

              return (
                <>
                  <form.Field name="asset">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="transfer-asset">
                          {t("ledger.transferForm.asset")}
                        </Label>
                        <Select
                          value={assetId === "" ? NO_ASSET : assetId}
                          onValueChange={(next) => {
                            field.handleChange(next === NO_ASSET ? "" : next);
                            // The lot belongs to the holding that was just
                            // replaced, so it cannot survive the change.
                            form.setFieldValue("source_lot", "");
                          }}
                        >
                          <SelectTrigger id="transfer-asset" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_ASSET}>
                              {t("ledger.transferForm.noAsset")}
                            </SelectItem>
                            {transferable.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          id="transfer-asset-error"
                          errors={serverErrors.fieldErrors.asset ?? []}
                        />
                      </div>
                    )}
                  </form.Field>

                  {/*
                    Units move or cash moves, never both: the out leg's crypto
                    shape is `{ quantity: NEGATIVE, cash: ZERO }`, and its
                    cash shape carries no quantity at all.
                  */}
                  {movesUnits ? (
                    <form.Field name="quantity">
                      {(field) => (
                        <DecimalField
                          name="quantity"
                          scale={SCALE.quantity}
                          integerDigits={INTEGER_DIGITS.quantity}
                          label={t("ledger.transferForm.quantity")}
                          errors={[
                            ...field.state.meta.errors,
                            ...(serverErrors.fieldErrors.quantity ?? []),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                  ) : (
                    <form.Field name="amount">
                      {(field) => (
                        <MoneyField
                          name="amount"
                          label={t("ledger.transferForm.amount")}
                          currency={currencyOf(assetId, sourceId)}
                          errors={[
                            ...field.state.meta.errors,
                            ...(serverErrors.fieldErrors.cash_amount ?? []),
                            ...(serverErrors.fieldErrors.cash_amount_minor ??
                              []),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                  )}

                  {assetId !== "" && (
                    <form.Field name="source_lot">
                      {(field) => (
                        <LotSelect
                          name="transfer-source-lot"
                          accountId={sourceId}
                          assetId={assetId}
                          value={field.state.value}
                          onChange={field.handleChange}
                          isUnitBased={movesUnits}
                          errors={[
                            ...field.state.meta.errors,
                            ...(serverErrors.fieldErrors.source_lot ?? []),
                          ]}
                        />
                      )}
                    </form.Field>
                  )}
                </>
              );
            }}
          </form.Subscribe>

          <form.Field name="note">
            {(field) => (
              <TextField
                name="note"
                label={t("ledger.transferForm.note")}
                hint={t("ledger.form.optional")}
                autoComplete="off"
                errors={serverErrors.fieldErrors.note ?? []}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>

          <FormError errors={serverErrors.formErrors} />
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => void navigate({ to: PATHS.LEDGER })}
                >
                  {t("ledger.form.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {t("ledger.transferForm.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
