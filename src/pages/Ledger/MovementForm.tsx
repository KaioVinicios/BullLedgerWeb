/**
 * The ledger's entry form: account → asset → what happened → the fields that
 * shape implies.
 *
 * Two things make it different from every other form in this app.
 *
 * The first is that it does not know its own rules. Which types an asset may
 * take, which sign each carries, whether it accepts a fee, a unit price, or a
 * lot — all of that is the server's table, fetched once per session from
 * `GET /api/movement-types/` and read through `schemas/movementSpec.ts`. An
 * invalid combination is therefore unofferable by construction rather than by
 * a rule restated here and left to drift.
 *
 * The second is that the user never types a minus sign. Every numeric field
 * asks for a magnitude, and `toMovementRequest` applies the sign the shape
 * requires at the wire. "Money out" is a label, not an instruction to negate.
 */
import { useRef, useState } from "react";
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
import Big from "big.js";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DecimalField } from "@/forms/DecimalField";
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
import { PositionHint } from "@/pages/Ledger/PositionHint";
import { TradeIdentityHint } from "@/pages/Ledger/TradeIdentityHint";
import { PATHS } from "@/routes/path";
import { MOVEMENT_TYPES, type Archetype } from "@/schemas/apiEnums";
import {
  acceptsQuantity,
  allowsFee,
  carriesUnitPrice,
  quantityRequired,
  requiresLot,
  shapeFor,
  specFor,
  type MovementShape,
  type MovementType,
  type MovementTypeSpec,
} from "@/schemas/movementSpec";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { movementTypesQuery } from "@/services/movementTypes";
import {
  invalidateLedger,
  recordMovement,
  replaceMovement,
  type Movement,
  type MovementRecordRequest,
} from "@/services/movements";
import { typesFor } from "@/schemas/movementSpec";
import { todayCalendarDate } from "@/utils/date";
import { holdingQuery } from "@/services/portfolio";
import {
  formatDecimal,
  INTEGER_DIGITS,
  parseDecimalInput,
  SCALE,
} from "@/utils/decimal";
import {
  formatMoney,
  minorUnitsToDecimalString,
  parseMoneyInput,
  type Currency,
  type Money,
} from "@/utils/money";
import {
  toMovementRequest,
  type MovementFormValues,
  type QuantityDirection,
} from "@/utils/movementWire";
import { accountLabel } from "@/utils/accountLabel";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Radix select values are strings; "no asset" needs one of its own. */
const NO_ASSET = "none";

/** BRL, USD, and CAD all use two minor digits. */
const MONEY_SCALE = 2;

/**
 * Server keys with an input here.
 *
 * Both spellings of the two money fields are claimed on purpose. The serializer
 * rejects under `cash_delta` / `fee`, but `Movement.clean()` rejects under the
 * *model* field names — `cash_delta_minor`, `fee_minor` — and a message keyed
 * on a name no input claims lands in the banner instead of on the field.
 * Phase 5's live walk found exactly that shape of bug with `issuer`.
 */
const CLAIMED_FIELDS = [
  "account",
  "asset",
  "type",
  "occurred_on",
  "quantity_delta",
  "unit_price",
  "cash_delta",
  "cash_delta_minor",
  "fee",
  "fee_minor",
  "fx_rate",
  "lot",
  "note",
] as const;

type MovementCategory =
  "CASH_FLOW" | "TRADE" | "INCOME" | "LIFECYCLE" | "COST" | "CORPORATE_ACTION";

/**
 * The taxonomy's own reading order (movements.md §2), for grouping the type
 * select. Presentation only — it decides nothing about validity, which is why
 * it can live here while the matrix cannot.
 */
const CATEGORY_OF: Record<MovementType, MovementCategory> = {
  DEPOSIT: "CASH_FLOW",
  WITHDRAWAL: "CASH_FLOW",
  TRANSFER_IN: "CASH_FLOW",
  TRANSFER_OUT: "CASH_FLOW",
  BUY: "TRADE",
  SELL: "TRADE",
  DIVIDEND: "INCOME",
  DISTRIBUTION: "INCOME",
  INTEREST: "INCOME",
  COUPON: "INCOME",
  MATURITY: "LIFECYCLE",
  REDEMPTION: "LIFECYCLE",
  FEE: "COST",
  TAX: "COST",
  SPLIT: "CORPORATE_ACTION",
  BONUS: "CORPORATE_ACTION",
};

const CATEGORY_ORDER: MovementCategory[] = [
  "CASH_FLOW",
  "TRADE",
  "INCOME",
  "LIFECYCLE",
  "COST",
  "CORPORATE_ACTION",
];

/** Which sentence the money field uses; the shape decides, not the screen. */
function amountLabelKey(
  spec: MovementTypeSpec,
): "amountPaid" | "amountReceived" | "amountCharged" {
  if (spec.type === "FEE" || spec.type === "TAX") return "amountCharged";

  return spec.shape.cash === "NEGATIVE" ? "amountPaid" : "amountReceived";
}

/**
 * And which sentence the quantity uses. The shape's sign is the direction the
 * units moved, so the label can state it and the input can stay a magnitude.
 */
function quantityLabelKey(
  spec: MovementTypeSpec,
  shape: MovementShape,
):
  | "quantityAcquired"
  | "quantityDisposed"
  | "quantityGranted"
  | "quantityChanged" {
  // A bonus issue is granted rather than acquired: nothing was bought.
  if (spec.type === "BONUS") return "quantityGranted";

  switch (shape.quantity) {
    case "NEGATIVE":
    case "NEGATIVE_OR_NULL":
      return "quantityDisposed";
    case "NONZERO":
      return "quantityChanged";
    default:
      return "quantityAcquired";
  }
}

/**
 * Normalizes a decimal the user typed in their own locale into the canonical
 * string the API expects — `1.234,5` in pt-BR is `1234.5` on the wire.
 *
 * A blank stays blank, which is a real answer for every optional field here.
 * An unparseable value passes through untouched because validation has already
 * refused the submit; falling back to the raw text keeps this from inventing a
 * number where there was none.
 */
function canonicalDecimal(
  value: string,
  locale: string,
  scale: number,
): string {
  const typed = value.trim();
  if (typed === "") return "";

  return parseDecimalInput(typed, locale, scale) ?? typed;
}

/**
 * Prefills a correction with what was recorded, written the way this reader
 * types.
 *
 * Both halves of that matter. The wire's `-204.00` is a magnitude here, because
 * every input on this form asks for one and the shape re-applies the sign at
 * submit. And it is formatted **into the active locale**, because the parsers
 * on the way back out read the active locale: handing `19.40` to a pt-BR reader
 * would have `.` read as a thousands separator and turn a price of nineteen
 * into one of one thousand nine hundred and forty.
 */
function defaultsFor(
  movement: Movement | undefined,
  firstType: MovementType,
  locale: string,
): MovementFormValues {
  const magnitude = (value: string | null, scale: number) =>
    value ? formatDecimal(value.replace("-", ""), locale, scale) : "";

  const money = (value: Money | null) =>
    value
      ? formatDecimal(
          minorUnitsToDecimalString(Math.abs(value.amount)),
          locale,
          MONEY_SCALE,
        )
      : "";

  return {
    account: movement?.account ?? "",
    asset: movement?.asset ?? "",
    type: movement?.type ?? firstType,
    occurred_on: movement?.occurred_on ?? todayCalendarDate(),
    quantity: magnitude(movement?.quantity_delta ?? null, SCALE.quantity),
    direction:
      movement?.quantity_delta?.startsWith("-") === true ? "LOST" : "GAINED",
    unit_price: magnitude(movement?.unit_price ?? null, SCALE.unitPrice),
    amount: money(movement?.cash_delta ?? null),
    fee: money(movement?.fee ?? null),
    fx_rate: magnitude(movement?.fx_rate ?? null, SCALE.rate),
    note: movement?.note ?? "",
    lot: movement?.lot ?? "",
  };
}

export function MovementForm({ movement }: { movement?: Movement }) {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);
  const keepGoing = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Resolved by the route's loader, so this never suspends on first render.
  const { data: specs } = useSuspenseQuery(movementTypesQuery);

  // Only live rows take new activity: offering an archived account or asset
  // here would undo the act of archiving it.
  const live = {} as const;
  const { data: accounts } = useQuery({
    queryKey: accountKeys.list(live),
    queryFn: () => listAccounts(live),
  });
  const { data: assets } = useQuery({
    queryKey: assetKeys.list(live),
    queryFn: () => listAssets(live),
  });

  const assetRows = assets?.results ?? [];
  const accountRows = accounts?.results ?? [];

  const schema = z
    .object({
      account: z.string().min(1, t("ledger.form.errors.account")),
      asset: z.string(),
      // The enum rather than a plain string: the form's own state is typed to
      // the taxonomy, and a widened `string` here would quietly let the schema
      // hand back a value the wire builder cannot accept.
      type: z.enum(MOVEMENT_TYPES),
      direction: z.enum(["GAINED", "LOST"]),
      occurred_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, t("ledger.form.errors.date")),
      quantity: z.string(),
      unit_price: z.string(),
      amount: z.string(),
      fee: z.string(),
      fx_rate: z.string(),
      note: z.string(),
      lot: z.string(),
    })
    /**
     * The rules that depend on the chosen type rather than on the field alone.
     * Each one mirrors a rejection the server would otherwise send back, and
     * says it where the value was typed instead.
     */
    .superRefine((values, ctx) => {
      const asset = assetRows.find((row) => row.id === values.asset) ?? null;
      const archetype: Archetype | null = asset?.archetype ?? null;
      const spec = specFor(specs, values.type);
      if (!spec) return;

      const shape = shapeFor(spec, archetype);
      const quantity = values.quantity.trim();
      const unitPrice = values.unit_price.trim();
      const fee = values.fee.trim();

      if (acceptsQuantity(shape)) {
        const invalid =
          quantity === ""
            ? quantityRequired(shape, archetype)
            : parseDecimalInput(quantity, locale, SCALE.quantity) === null;

        if (invalid) {
          ctx.addIssue({
            code: "custom",
            message: t("ledger.form.errors.quantity"),
            path: ["quantity"],
          });
        }
      }

      // `movement_unit_price_required`: on a trade the two arrive together or
      // not at all, so a stated quantity makes the price mandatory.
      if (carriesUnitPrice(spec) && quantity !== "") {
        if (parseDecimalInput(unitPrice, locale, SCALE.unitPrice) === null) {
          ctx.addIssue({
            code: "custom",
            message: t("ledger.form.errors.unitPrice"),
            path: ["unit_price"],
          });
        }
      }

      // Checked only where the type can carry a fee: a value left behind on a
      // field the current type does not render must not block the submit.
      if (allowsFee(spec) && fee !== "") {
        const currency = currencyFor(asset, values.account, accountRows);

        if (!parseMoneyInput(fee, currency, locale)) {
          ctx.addIssue({
            code: "custom",
            message: t("ledger.form.errors.fee"),
            path: ["fee"],
          });
        }
      }

      // Optional, and blank is the common answer — but a rate that *is* typed
      // is recorded verbatim, so it has to be a rate.
      if (
        values.fx_rate.trim() !== "" &&
        parseDecimalInput(values.fx_rate, locale, SCALE.rate) === null
      ) {
        ctx.addIssue({
          code: "custom",
          message: t("ledger.form.errors.fxRate"),
          path: ["fx_rate"],
        });
      }

      if (!requiresLot(spec, values.asset !== "")) return;

      if (values.lot === "") {
        ctx.addIssue({
          code: "custom",
          message: t("ledger.form.errors.lot"),
          path: ["lot"],
        });
        return;
      }

      /**
       * The overdraw pre-check, against the projection `LotSelect` has already
       * fetched — read from the cache rather than re-queried, because only the
       * validator can stop a submit and only one of the two should ask.
       *
       * Silent when the projection is unavailable: the server enforces
       * `movement_lot_overdrawn` regardless, and a check that cannot see the
       * remainder must not invent one.
       */
      const holding = queryClient.getQueryData(
        holdingQuery(values.account, values.asset).queryKey,
      );
      const lot = holding?.lots.find((row) => row.lot === values.lot);
      if (!lot) return;

      const overdrawn = (remaining: string) =>
        ctx.addIssue({
          code: "custom",
          message: t("ledger.form.lotOverdrawn", { remaining }),
          path: ["lot"],
        });

      if (lot.quantity_remaining !== null && quantity !== "") {
        const wanted = parseDecimalInput(quantity, locale, SCALE.quantity);
        // `Big`, never a float: a crypto remainder runs to eighteen places.
        if (wanted && new Big(wanted).gt(new Big(lot.quantity_remaining))) {
          overdrawn(
            formatDecimal(lot.quantity_remaining, locale, SCALE.quantity),
          );
        }
        return;
      }

      // A lump-principal contribution is drawn down in money instead.
      const principal = lot.principal_remaining;
      if (principal !== null && values.amount.trim() !== "") {
        const currency = currencyFor(asset, values.account, accountRows);
        const wanted = parseMoneyInput(values.amount, currency, locale);

        if (
          wanted &&
          Math.abs(wanted.amount) > Math.abs(principal.native.amount)
        ) {
          overdrawn(formatMoney(principal.native, locale));
        }
      }
    });

  const mutation = useMutation({
    mutationFn: (body: MovementRecordRequest) =>
      movement ? replaceMovement(movement.id, body) : recordMovement(body),
    onSuccess: async () => {
      await invalidateLedger(queryClient);
      toast.success(t(movement ? "ledger.corrected" : "ledger.recorded"));

      if (keepGoing.current) {
        resetForNext();
        return;
      }

      void navigate({ to: PATHS.LEDGER });
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? claimFieldErrors(
              translateServerErrors(error, tError),
              CLAIMED_FIELDS,
            )
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: defaultsFor(movement, typesFor(specs, null)[0]!, locale),
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);

      const values = value as MovementFormValues;
      const asset = assetRows.find((row) => row.id === values.asset) ?? null;
      const spec = specFor(specs, values.type);
      if (!spec) return;

      const shape = shapeFor(spec, asset?.archetype ?? null);
      const currency = currencyFor(asset, values.account, accountRows);

      const body = toMovementRequest({
        // Decimals reach the wire canonical, never as the reader's locale
        // spelled them: a quantity typed `1.234,5` in pt-BR is `1234.5` here.
        // Money is not among them — `toMovementRequest` parses that itself,
        // in the same locale, into integer minor units.
        values: {
          ...values,
          quantity: canonicalDecimal(values.quantity, locale, SCALE.quantity),
          unit_price: canonicalDecimal(
            values.unit_price,
            locale,
            SCALE.unitPrice,
          ),
          fx_rate: canonicalDecimal(values.fx_rate, locale, SCALE.rate),
        },
        spec,
        shape,
        currency,
        locale,
      });

      if (!body) {
        // `toMovementRequest` returns null only when an amount cannot be held
        // exactly. Surfacing that as a field error rather than an exception
        // keeps the money path's refusal visible where it happened.
        setServerErrors({
          fieldErrors: { cash_delta: [t("ledger.form.errors.amount")] },
          formErrors: [],
        });
        return;
      }

      try {
        await mutation.mutateAsync(body);
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  /**
   * Someone entering a statement enters ten rows in the same account on the
   * same day. Account, asset, type, and date survive on purpose; only the
   * numbers clear, and focus goes back where the next one is typed.
   */
  function resetForNext() {
    for (const field of [
      "quantity",
      "unit_price",
      "amount",
      "fee",
      "note",
      "lot",
    ] as const) {
      form.setFieldValue(field, "");
    }
    amountRef.current?.focus();
  }

  const amountErrors = [
    ...(serverErrors.fieldErrors.cash_delta ?? []),
    ...(serverErrors.fieldErrors.cash_delta_minor ?? []),
    ...(serverErrors.fieldErrors["cash_delta.amount"] ?? []),
  ];

  const feeErrors = [
    ...(serverErrors.fieldErrors.fee ?? []),
    ...(serverErrors.fieldErrors.fee_minor ?? []),
    ...(serverErrors.fieldErrors["fee.amount"] ?? []),
  ];

  return (
    <form
      noValidate
      aria-labelledby="movement-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <span id="movement-form-title" className="sr-only">
        {movement
          ? t("ledger.form.correctTitle")
          : t("ledger.form.createTitle")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          <form.Field name="account">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="movement-account">
                  {t("ledger.form.account")}
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger id="movement-account" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountRows.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {accountLabel(row, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError
                  id="movement-account-error"
                  errors={[
                    ...field.state.meta.errors,
                    ...(serverErrors.fieldErrors.account ?? []),
                  ]}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.asset}>
            {(assetId) => (
              <form.Field name="asset">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="movement-asset">
                      {t("ledger.form.asset")}
                    </Label>
                    <Select
                      value={assetId === "" ? NO_ASSET : assetId}
                      onValueChange={(next) => {
                        const chosen = next === NO_ASSET ? "" : next;
                        field.handleChange(chosen);

                        // An archetype decides which types exist. Leaving an
                        // incompatible one selected would mean submitting
                        // something the server rejects — "unofferable by
                        // construction" has to survive the second choice too.
                        const archetype =
                          assetRows.find((row) => row.id === chosen)
                            ?.archetype ?? null;
                        const offered = typesFor(specs, archetype);
                        if (!offered.includes(form.state.values.type)) {
                          form.setFieldValue("type", offered[0]!);
                        }
                      }}
                    >
                      <SelectTrigger id="movement-asset" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ASSET}>
                          {t("ledger.form.noAsset")}
                        </SelectItem>
                        {assetRows.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p
                      id="movement-asset-hint"
                      className="text-xs text-muted-foreground"
                    >
                      {t("ledger.form.assetHint")}
                    </p>
                    <FieldError
                      id="movement-asset-error"
                      errors={serverErrors.fieldErrors.asset ?? []}
                    />
                  </div>
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Subscribe
            selector={(state) =>
              [state.values.asset, state.values.account] as const
            }
          >
            {([assetId, accountId]) => {
              const asset = assetRows.find((row) => row.id === assetId) ?? null;
              const archetype: Archetype | null = asset?.archetype ?? null;
              const offered = typesFor(specs, archetype);
              const currency = currencyFor(asset, accountId, accountRows);
              const baseCurrency = accountRows.find(
                (row) => row.id === accountId,
              )?.base_currency;

              return (
                <>
                  <form.Field name="type">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="movement-type">
                          {t("ledger.form.type")}
                        </Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(next) =>
                            field.handleChange(next as MovementType)
                          }
                        >
                          <SelectTrigger id="movement-type" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_ORDER.filter((category) =>
                              offered.some(
                                (type) => CATEGORY_OF[type] === category,
                              ),
                            ).map((category) => (
                              <SelectGroup key={category}>
                                <SelectLabel>
                                  {t(`enums.movementCategory.${category}`)}
                                </SelectLabel>
                                {offered
                                  .filter(
                                    (type) => CATEGORY_OF[type] === category,
                                  )
                                  .map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {t(`enums.movementType.${type}`)}
                                    </SelectItem>
                                  ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          id="movement-type-error"
                          errors={[
                            ...field.state.meta.errors,
                            ...(serverErrors.fieldErrors.type ?? []),
                          ]}
                        />
                      </div>
                    )}
                  </form.Field>

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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    )}
                  </form.Field>

                  <form.Subscribe
                    selector={(state) =>
                      [
                        state.values.type,
                        state.values.quantity,
                        state.values.unit_price,
                        state.values.amount,
                        state.values.fee,
                      ] as const
                    }
                  >
                    {([type, quantity, unitPrice, amount, fee]) => {
                      const spec = specFor(specs, type);
                      if (!spec) return null;
                      const shape = shapeFor(spec, archetype);

                      const takesQuantity = acceptsQuantity(shape);
                      const quantityNeeded = quantityRequired(shape, archetype);
                      // The server pairs the two — a price with nothing to
                      // price is `movement_unit_price_forbidden` — so the
                      // input arrives with the quantity and leaves with it.
                      const showUnitPrice =
                        carriesUnitPrice(spec) &&
                        takesQuantity &&
                        (quantityNeeded || quantity.trim() !== "");

                      return (
                        <>
                          {/*
                            Only on an exit. An entry's lot is created by the
                            server, and sending one is
                            `movement_lot_not_accepted`.
                          */}
                          {requiresLot(spec, assetId !== "") && (
                            <form.Field name="lot">
                              {(field) => (
                                <LotSelect
                                  accountId={accountId}
                                  assetId={assetId}
                                  value={field.state.value}
                                  onChange={field.handleChange}
                                  isUnitBased={takesQuantity}
                                  errors={[
                                    ...field.state.meta.errors,
                                    ...(serverErrors.fieldErrors.lot ?? []),
                                  ]}
                                />
                              )}
                            </form.Field>
                          )}

                          {/*
                            The one shape that allows both signs, which is
                            `SPLIT` alone. Every other type implies its own
                            direction, so asking would be asking twice.
                          */}
                          {shape.quantity === "NONZERO" && (
                            <form.Field name="direction">
                              {(field) => (
                                <div className="space-y-3">
                                  <span
                                    id="movement-direction-label"
                                    className="block text-sm font-medium"
                                  >
                                    {t("ledger.form.direction")}
                                  </span>
                                  <RadioGroup
                                    className="flex flex-wrap gap-x-6 gap-y-2"
                                    value={field.state.value}
                                    onValueChange={(value) =>
                                      field.handleChange(
                                        value as QuantityDirection,
                                      )
                                    }
                                    aria-labelledby="movement-direction-label"
                                  >
                                    {(["GAINED", "LOST"] as const).map(
                                      (option) => (
                                        <div
                                          key={option}
                                          className="flex items-center gap-2.5"
                                        >
                                          <RadioGroupItem
                                            id={`movement-direction-${option}`}
                                            value={option}
                                          />
                                          <Label
                                            htmlFor={`movement-direction-${option}`}
                                            className="font-normal"
                                          >
                                            {t(
                                              option === "GAINED"
                                                ? "ledger.form.directionGained"
                                                : "ledger.form.directionLost",
                                            )}
                                          </Label>
                                        </div>
                                      ),
                                    )}
                                  </RadioGroup>
                                  <PositionHint
                                    accountId={accountId}
                                    assetId={assetId}
                                  />
                                </div>
                              )}
                            </form.Field>
                          )}

                          {takesQuantity && (
                            <div
                              className={cn(
                                "grid gap-4",
                                showUnitPrice && "sm:grid-cols-2",
                              )}
                            >
                              <form.Field name="quantity">
                                {(field) => (
                                  <DecimalField
                                    name="quantity"
                                    scale={SCALE.quantity}
                                    integerDigits={INTEGER_DIGITS.quantity}
                                    label={t(
                                      `ledger.form.${quantityLabelKey(spec, shape)}` as const,
                                    )}
                                    hint={
                                      quantityNeeded
                                        ? undefined
                                        : t("ledger.form.quantityOptional")
                                    }
                                    errors={[
                                      ...field.state.meta.errors,
                                      ...(serverErrors.fieldErrors
                                        .quantity_delta ?? []),
                                    ]}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={field.handleChange}
                                  />
                                )}
                              </form.Field>

                              {showUnitPrice && (
                                <form.Field name="unit_price">
                                  {(field) => (
                                    <DecimalField
                                      name="unit_price"
                                      scale={SCALE.unitPrice}
                                      integerDigits={INTEGER_DIGITS.unitPrice}
                                      label={t("ledger.form.unitPrice")}
                                      errors={[
                                        ...field.state.meta.errors,
                                        ...(serverErrors.fieldErrors
                                          .unit_price ?? []),
                                      ]}
                                      value={field.state.value}
                                      onBlur={field.handleBlur}
                                      onChange={field.handleChange}
                                    />
                                  )}
                                </form.Field>
                              )}
                            </div>
                          )}

                          {/*
                            A corporate action moves no cash, so there is no
                            amount to ask for: an input whose only valid answer
                            is zero is a question that should not be asked.
                          */}
                          {shape.cash !== "ZERO" && (
                            <form.Field name="amount">
                              {(field) => (
                                <MoneyField
                                  name="amount"
                                  label={t(
                                    `ledger.form.${amountLabelKey(spec)}` as const,
                                  )}
                                  currency={currency}
                                  hint={t("ledger.form.amountFeesIncluded")}
                                  errors={[
                                    ...field.state.meta.errors,
                                    ...amountErrors,
                                  ]}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={field.handleChange}
                                  ref={amountRef}
                                />
                              )}
                            </form.Field>
                          )}

                          {allowsFee(spec) && (
                            <form.Field name="fee">
                              {(field) => (
                                <MoneyField
                                  name="fee"
                                  label={t("ledger.form.fee")}
                                  currency={currency}
                                  hint={t("ledger.form.feeHint")}
                                  errors={[
                                    ...field.state.meta.errors,
                                    ...feeErrors,
                                  ]}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={field.handleChange}
                                />
                              )}
                            </form.Field>
                          )}

                          {carriesUnitPrice(spec) && (
                            <TradeIdentityHint
                              quantity={quantity}
                              unitPrice={showUnitPrice ? unitPrice : ""}
                              amount={amount}
                              fee={allowsFee(spec) ? fee : ""}
                              currency={currency}
                              cashRule={shape.cash}
                              locale={locale}
                            />
                          )}

                          {/*
                            The event-date rate, as a recorded fact.

                            Left blank, the server resolves it: 1 when the
                            movement's currency is the account's base,
                            otherwise the feed rate on `occurred_on`, otherwise
                            a 400 keyed here. The client cannot show the rate
                            it is about to record — the handoff asked for an
                            `as_of` read and it was declined, because the
                            resolver backfills from a third party and writes as
                            it reads, which a GET must not do. Blank-means-the-
                            day's-rate is the shipping behaviour, not a
                            workaround. What the copy can promise, because the
                            ladder guarantees it: an explicit rate always wins,
                            is recorded verbatim, and is never re-resolved.
                          */}
                          {accountId !== "" &&
                            shape.cash !== "ZERO" &&
                            (currency === baseCurrency ? (
                              <p className="text-xs text-muted-foreground">
                                {t("ledger.form.fxSameCurrency")}
                              </p>
                            ) : (
                              <form.Field name="fx_rate">
                                {(field) => (
                                  <DecimalField
                                    name="fx_rate"
                                    scale={SCALE.rate}
                                    integerDigits={INTEGER_DIGITS.rate}
                                    label={t("ledger.form.fxRate")}
                                    hint={t("ledger.form.fxRateHint")}
                                    errors={[
                                      ...field.state.meta.errors,
                                      ...(serverErrors.fieldErrors.fx_rate ??
                                        []),
                                    ]}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={field.handleChange}
                                  />
                                )}
                              </form.Field>
                            ))}
                        </>
                      );
                    }}
                  </form.Subscribe>
                </>
              );
            }}
          </form.Subscribe>

          <form.Field name="note">
            {(field) => (
              <TextField
                name="note"
                label={t("ledger.form.note")}
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
                {!movement && (
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      keepGoing.current = true;
                    }}
                  >
                    {t("ledger.form.createAndAnother")}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => {
                    keepGoing.current = false;
                  }}
                >
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {movement ? t("ledger.form.save") : t("ledger.form.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}

/**
 * A movement is recorded in the asset's own currency; without an asset it is
 * the account's. This is what every money field on the form is denominated in,
 * and the reason the account is asked for first.
 */
function currencyFor(
  asset: { currency: Currency } | null,
  accountId: string,
  accounts: ReadonlyArray<{ id: string; base_currency: Currency }>,
): Currency {
  return (
    asset?.currency ??
    accounts.find((row) => row.id === accountId)?.base_currency ??
    "BRL"
  );
}
