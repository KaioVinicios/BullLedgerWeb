import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DecimalField } from "@/forms/DecimalField";
import { IntegerField } from "@/forms/IntegerField";
import { MoneyField } from "@/forms/MoneyField";
import { PercentField } from "@/forms/PercentField";
import { SelectField } from "@/forms/SelectField";
import { TextField } from "@/forms/TextField";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { PATHS } from "@/routes/path";
import {
  ARCHETYPES,
  COMPOUNDINGS,
  COUNTRIES,
  COUPON_FREQUENCIES,
  CURRENCIES,
  CURRENCY_BY_COUNTRY,
  DEPOSIT_INSURANCES,
  EXCHANGES,
  INSTRUMENT_KINDS,
  ISSUER_TYPES,
  LIQUIDITIES,
  RATE_INDEXES,
  RATE_TYPES,
  SECURITY_TYPES,
  type Archetype,
  type Compounding,
  type Country,
  type CouponFrequency,
  type Currency,
  type DepositInsurance,
  type Exchange,
  type InstrumentKind,
  type IssuerType,
  type Liquidity,
  type RateIndex,
  type RateType,
  type SecurityType,
} from "@/schemas/apiEnums";
import {
  assetKeys,
  createAsset,
  updateAsset,
  type Asset,
  type AssetRequest,
  type AssetUpdate,
} from "@/services/assets";
import { institutionKeys, listInstitutions } from "@/services/institutions";
import {
  INTEGER_DIGITS,
  SCALE,
  fractionToPercent,
  MASK_PLACES,
  localizeDecimal,
  parseDecimalInput,
  percentToFraction,
} from "@/utils/decimal";
import { minorUnitsToDecimalString, parseMoneyInput } from "@/utils/money";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Radix select values are strings; "no issuer" needs its own. */
const NO_ISSUER = "none";

/**
 * Every server key this form has an input for; anything else lands in the
 * form banner via `claimFieldErrors` instead of vanishing — the live walk
 * found `issuer` doing exactly that before the field existed.
 */
const CLAIMED_FIELDS = [
  "name",
  "archetype",
  "currency",
  "country",
  "rate_type",
  "rate_index",
  "compounding",
  "deposit_insurance",
  "liquidity",
  "rate_value",
  "instrument_kind",
  "issuer_type",
  "issuer",
  "issuer_name",
  "maturity_date",
  "coupon_rate",
  "coupon_frequency",
  "tax_advantaged",
  "early_redemption",
  "issue_date",
  "face_value",
  "security_type",
  "ticker",
  "exchange",
  "pays_distributions",
  "isin",
  "fund_category",
  "unit_price",
  "management_fee",
  "performance_fee",
  "redemption_period",
  "symbol",
  "decimals",
  "price_currency",
  "chain",
] as const;

/**
 * One flat state carries every archetype's fields; the selected archetype
 * decides which slice is rendered, validated, and submitted. Flat rather
 * than nested because switching archetypes must not destroy what was typed
 * — a user who picks FIXED_INCOME by mistake and comes back has lost
 * nothing — and because the union member is assembled only at the wire.
 */
interface AssetFormValues {
  name: string;
  archetype: Archetype;
  currency: Currency;
  country: Country;
  rate_type: RateType;
  rate_index: RateIndex;
  compounding: Compounding;
  deposit_insurance: DepositInsurance;
  liquidity: Liquidity;
  rate_value: string;
  instrument_kind: InstrumentKind;
  issuer_type: IssuerType;
  issuer: string;
  maturity_date: string;
  coupon_rate: string;
  coupon_frequency: CouponFrequency;
  tax_advantaged: boolean;
  early_redemption: boolean;
  issuer_name: string;
  issue_date: string;
  face_value: string;
  security_type: SecurityType;
  ticker: string;
  exchange: Exchange;
  pays_distributions: boolean;
  isin: string;
  fund_category: string;
  unit_price: string;
  management_fee: string;
  performance_fee: string;
  redemption_period: string;
  symbol: string;
  decimals: string;
  price_currency: Currency;
  chain: string;
}

function defaultsFor(
  asset: Asset | undefined,
  locale: string,
): AssetFormValues {
  const localize = (value: string) => localizeDecimal(value, locale);

  const values: AssetFormValues = {
    name: asset?.name ?? "",
    archetype: asset?.archetype ?? "CASH_DEPOSIT",
    currency: asset?.currency ?? "BRL",
    country: asset?.country ?? "BR",
    rate_type: "FIXED",
    rate_index: "NONE",
    compounding: "DAILY",
    deposit_insurance: "NONE",
    liquidity: "IMMEDIATE",
    rate_value: "",
    instrument_kind: "CERTIFICATE",
    issuer_type: "BANK",
    issuer: NO_ISSUER,
    maturity_date: "",
    coupon_rate: "",
    coupon_frequency: "NONE",
    tax_advantaged: false,
    early_redemption: false,
    issuer_name: "",
    issue_date: "",
    face_value: "",
    security_type: "STOCK",
    ticker: "",
    exchange: "B3",
    pays_distributions: false,
    isin: "",
    fund_category: "",
    unit_price: "",
    management_fee: "",
    performance_fee: "",
    redemption_period: "",
    symbol: "",
    decimals: "18",
    price_currency: asset?.currency ?? "USD",
    chain: "",
  };

  if (!asset) return values;

  switch (asset.archetype) {
    case "CASH_DEPOSIT":
      return {
        ...values,
        rate_type: asset.rate_type,
        rate_index: asset.rate_index,
        compounding: asset.compounding,
        deposit_insurance: asset.deposit_insurance,
        liquidity: asset.liquidity,
        rate_value: fractionToPercent(asset.rate_value, locale),
      };
    case "FIXED_INCOME":
      return {
        ...values,
        instrument_kind: asset.instrument_kind,
        issuer_type: asset.issuer_type,
        issuer: asset.issuer ?? NO_ISSUER,
        maturity_date: asset.maturity_date,
        rate_type: asset.rate_type,
        rate_index: asset.rate_index,
        coupon_rate: fractionToPercent(asset.coupon_rate, locale),
        coupon_frequency: asset.coupon_frequency,
        tax_advantaged: asset.tax_advantaged,
        early_redemption: asset.early_redemption,
        deposit_insurance: asset.deposit_insurance,
        issuer_name: asset.issuer_name ?? "",
        issue_date: asset.issue_date ?? "",
        face_value: asset.face_value
          ? localizeDecimal(
              minorUnitsToDecimalString(asset.face_value.amount),
              locale,
              MASK_PLACES,
            )
          : "",
        rate_value: fractionToPercent(asset.rate_value, locale),
      };
    case "EXCHANGE_SECURITY":
      return {
        ...values,
        security_type: asset.security_type,
        ticker: asset.ticker,
        exchange: asset.exchange,
        pays_distributions: asset.pays_distributions,
        isin: asset.isin ?? "",
      };
    case "NAV_FUND":
      return {
        ...values,
        fund_category: asset.fund_category,
        unit_price: asset.unit_price ? localize(asset.unit_price) : "",
        management_fee: fractionToPercent(asset.management_fee, locale),
        performance_fee: fractionToPercent(asset.performance_fee, locale),
        redemption_period: asset.redemption_period ?? "",
      };
    case "CRYPTO":
      return {
        ...values,
        symbol: asset.symbol,
        decimals: String(asset.decimals),
        price_currency: asset.price_currency,
        chain: asset.chain ?? "",
      };
  }
}

export function AssetForm({ asset }: { asset?: Asset }) {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const currencyNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: "currency" }),
    [locale],
  );
  const regionNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: "region" }),
    [locale],
  );

  // Certificates are issued by an institution the user has registered; the
  // issuer select offers the live ones.
  const institutionsQuery = {};
  const { data: institutionsPage } = useQuery({
    queryKey: institutionKeys.list(institutionsQuery),
    queryFn: () => listInstitutions(institutionsQuery),
  });
  const institutions = institutionsPage?.results ?? [];
  const institutionName = (id: string) =>
    institutions.find((row) => row.id === id)?.name ?? id;

  const schema = useMemo(() => {
    const percentOk = (value: string) =>
      value.trim() === "" || percentToFraction(value, locale) !== null;
    const decimalOk = (value: string, scale: number) =>
      value.trim() === "" || parseDecimalInput(value, locale, scale) !== null;

    const percentField = z
      .string()
      .refine(percentOk, { message: t("assets.form.errors.percent") });

    return z
      .object({
        name: z.string().trim().min(1, t("assets.form.errors.name")),
        archetype: z.enum(ARCHETYPES),
        currency: z.enum(CURRENCIES),
        country: z.enum(COUNTRIES),
        rate_type: z.enum(RATE_TYPES),
        rate_index: z.enum(RATE_INDEXES),
        compounding: z.enum(COMPOUNDINGS),
        deposit_insurance: z.enum(DEPOSIT_INSURANCES),
        liquidity: z.enum(LIQUIDITIES),
        rate_value: percentField,
        instrument_kind: z.enum(INSTRUMENT_KINDS),
        issuer_type: z.enum(ISSUER_TYPES),
        issuer: z.string(),
        maturity_date: z.string(),
        coupon_rate: z.string(),
        coupon_frequency: z.enum(COUPON_FREQUENCIES),
        tax_advantaged: z.boolean(),
        early_redemption: z.boolean(),
        issuer_name: z.string(),
        issue_date: z.string(),
        face_value: z
          .string()
          .refine(
            (value) =>
              value.trim() === "" ||
              parseMoneyInput(value, "USD", locale) !== null,
            { message: t("assets.form.errors.money") },
          ),
        security_type: z.enum(SECURITY_TYPES),
        ticker: z.string(),
        exchange: z.enum(EXCHANGES),
        pays_distributions: z.boolean(),
        isin: z.string(),
        fund_category: z.string(),
        unit_price: z
          .string()
          .refine((value) => decimalOk(value, SCALE.unitPrice), {
            message: t("assets.form.errors.decimal"),
          }),
        management_fee: percentField,
        performance_fee: percentField,
        redemption_period: z.string(),
        symbol: z.string(),
        decimals: z.string(),
        price_currency: z.enum(CURRENCIES),
        chain: z.string(),
      })
      .superRefine((values, ctx) => {
        const require = (field: keyof AssetFormValues, message: string) => {
          if (String(values[field]).trim() === "") {
            ctx.addIssue({ code: "custom", message, path: [field] });
          }
        };

        switch (values.archetype) {
          case "FIXED_INCOME":
            require("maturity_date", t("assets.form.errors.maturityDate"));
            // The server's certificate rule, mirrored: surfaced live by the
            // Phase 5 walk as a rejection, now unofferable to hit.
            if (
              values.instrument_kind === "CERTIFICATE" &&
              values.issuer === NO_ISSUER
            ) {
              ctx.addIssue({
                code: "custom",
                message: t("assets.form.errors.issuerRequired"),
                path: ["issuer"],
              });
            }
            if (percentToFraction(values.coupon_rate, locale) === null) {
              ctx.addIssue({
                code: "custom",
                message: t("assets.form.errors.percentRequired"),
                path: ["coupon_rate"],
              });
            }
            break;
          case "EXCHANGE_SECURITY":
            require("ticker", t("assets.form.errors.ticker"));
            break;
          case "NAV_FUND":
            require("fund_category", t("assets.form.errors.fundCategory"));
            break;
          case "CRYPTO": {
            require("symbol", t("assets.form.errors.symbol"));
            const decimals = Number(values.decimals);
            if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
              ctx.addIssue({
                code: "custom",
                message: t("assets.form.errors.decimals"),
                path: ["decimals"],
              });
            }
            break;
          }
        }
      });
  }, [t, locale]);

  const mutation = useMutation({
    mutationFn: (body: AssetRequest | AssetUpdate) =>
      asset
        ? updateAsset(asset.id, body as AssetUpdate)
        : createAsset(body as AssetRequest),
    onSuccess: (saved) => {
      queryClient.setQueryData(assetKeys.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      toast.success(
        t(asset ? "structure.saved" : "structure.created", {
          name: saved.name,
        }),
      );
      void navigate({ to: PATHS.ASSETS });
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
    defaultValues: defaultsFor(asset, locale),
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);

      const blankToNull = (input: string) => {
        const trimmed = input.trim();
        return trimmed === "" ? null : trimmed;
      };
      const percentOrNull = (input: string) =>
        input.trim() === "" ? null : percentToFraction(input, locale);

      const base = {
        name: value.name.trim(),
        currency: value.currency,
        country: value.country,
      };

      let body: AssetRequest;
      switch (value.archetype) {
        case "CASH_DEPOSIT":
          body = {
            ...base,
            archetype: "CASH_DEPOSIT",
            rate_type: value.rate_type,
            rate_index: value.rate_index,
            compounding: value.compounding,
            deposit_insurance: value.deposit_insurance,
            liquidity: value.liquidity,
            rate_value: percentOrNull(value.rate_value),
          };
          break;
        case "FIXED_INCOME":
          body = {
            ...base,
            archetype: "FIXED_INCOME",
            instrument_kind: value.instrument_kind,
            issuer_type: value.issuer_type,
            issuer: value.issuer === NO_ISSUER ? null : value.issuer,
            maturity_date: value.maturity_date,
            rate_type: value.rate_type,
            rate_index: value.rate_index,
            // Validated non-null by the schema before this runs.
            coupon_rate: percentToFraction(value.coupon_rate, locale) ?? "0",
            coupon_frequency: value.coupon_frequency,
            tax_advantaged: value.tax_advantaged,
            early_redemption: value.early_redemption,
            deposit_insurance: value.deposit_insurance,
            issuer_name: blankToNull(value.issuer_name),
            issue_date: blankToNull(value.issue_date),
            face_value:
              value.face_value.trim() === ""
                ? null
                : parseMoneyInput(value.face_value, value.currency, locale),
            rate_value: percentOrNull(value.rate_value),
          };
          break;
        case "EXCHANGE_SECURITY":
          body = {
            ...base,
            archetype: "EXCHANGE_SECURITY",
            security_type: value.security_type,
            ticker: value.ticker.trim().toUpperCase(),
            exchange: value.exchange,
            pays_distributions: value.pays_distributions,
            isin: blankToNull(value.isin),
          };
          break;
        case "NAV_FUND":
          body = {
            ...base,
            archetype: "NAV_FUND",
            fund_category: value.fund_category.trim(),
            unit_price:
              value.unit_price.trim() === ""
                ? null
                : parseDecimalInput(value.unit_price, locale, SCALE.unitPrice),
            management_fee: percentOrNull(value.management_fee),
            performance_fee: percentOrNull(value.performance_fee),
            redemption_period: blankToNull(value.redemption_period),
          };
          break;
        case "CRYPTO":
          body = {
            ...base,
            archetype: "CRYPTO",
            symbol: value.symbol.trim().toUpperCase(),
            decimals: Number(value.decimals),
            price_currency: value.price_currency,
            chain: blankToNull(value.chain),
          };
          break;
      }

      try {
        if (asset) {
          // The update union carries no archetype — the schema itself forbids
          // changing it — so the discriminator is dropped at the wire.
          const { archetype, ...patch } = body;
          void archetype;
          await mutation.mutateAsync(patch as AssetUpdate);
        } else {
          await mutation.mutateAsync(body);
        }
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  const fieldErrors = (name: string) => serverErrors.fieldErrors[name] ?? [];

  return (
    <form
      noValidate
      aria-labelledby="asset-form-title"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <span id="asset-form-title" className="sr-only">
        {asset ? t("assets.form.editTitle") : t("assets.form.createTitle")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          {/* The archetype decides everything below it, so it comes first.
              On edit it is a fact, not a choice: a different archetype is a
              different asset. */}
          {asset ? (
            <div className="space-y-2">
              <span className="block text-sm font-medium">
                {t("assets.form.archetype")}
              </span>
              <Badge variant="secondary">
                {t(`enums.archetype.${asset.archetype}`)}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {t("assets.form.archetypeLocked")}
              </p>
            </div>
          ) : (
            <form.Field name="archetype">
              {(field) => (
                <div className="space-y-3">
                  <span
                    id="asset-archetype-label"
                    className="block text-sm font-medium"
                  >
                    {t("assets.form.archetype")}
                  </span>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(next) =>
                      field.handleChange(next as Archetype)
                    }
                    aria-labelledby="asset-archetype-label"
                    className="gap-3"
                  >
                    {ARCHETYPES.map((archetype) => (
                      <div key={archetype} className="flex items-start gap-2.5">
                        <RadioGroupItem
                          id={`archetype-${archetype}`}
                          value={archetype}
                          className="mt-0.5"
                        />
                        <div>
                          <Label
                            htmlFor={`archetype-${archetype}`}
                            className="font-normal"
                          >
                            {t(`enums.archetype.${archetype}`)}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t(`assets.form.archetypeHint.${archetype}`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </form.Field>
          )}

          <form.Field name="name">
            {(field) => (
              <TextField
                name={field.name}
                label={t("assets.form.name")}
                autoComplete="off"
                errors={[...field.state.meta.errors, ...fieldErrors("name")]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="currency">
              {(field) => (
                <SelectField
                  name="currency"
                  label={t("assets.form.currency")}
                  hint={t("assets.form.currencyHint")}
                  value={field.state.value}
                  options={CURRENCIES}
                  renderOption={(code) => `${code} — ${currencyNames.of(code)}`}
                  onChange={field.handleChange}
                  errors={fieldErrors("currency")}
                />
              )}
            </form.Field>

            <form.Field name="country">
              {(field) => (
                <SelectField
                  name="country"
                  label={t("assets.form.country")}
                  value={field.state.value}
                  options={COUNTRIES}
                  renderOption={(code) => regionNames.of(code) ?? code}
                  onChange={(country) => {
                    field.handleChange(country);
                    // The country an instrument belongs to decides what it is
                    // priced in — a default, not a lock (a BDR is Brazilian
                    // and quoted in BRL; a US stock held from Brazil is not).
                    form.setFieldValue(
                      "currency",
                      CURRENCY_BY_COUNTRY[country],
                    );
                  }}
                  errors={fieldErrors("country")}
                />
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.archetype}>
            {(archetype) => (
              <div className="space-y-6 border-t pt-6">
                {archetype === "CASH_DEPOSIT" && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <form.Field name="rate_type">
                        {(field) => (
                          <SelectField
                            name="rate_type"
                            label={t("assets.form.rateType")}
                            value={field.state.value}
                            options={RATE_TYPES}
                            renderOption={(option) =>
                              t(`enums.rateType.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("rate_type")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="rate_index">
                        {(field) => (
                          <SelectField
                            name="rate_index"
                            label={t("assets.form.rateIndex")}
                            value={field.state.value}
                            options={RATE_INDEXES}
                            renderOption={(option) =>
                              t(`enums.rateIndex.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("rate_index")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="compounding">
                        {(field) => (
                          <SelectField
                            name="compounding"
                            label={t("assets.form.compounding")}
                            value={field.state.value}
                            options={COMPOUNDINGS}
                            renderOption={(option) =>
                              t(`enums.compounding.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("compounding")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="liquidity">
                        {(field) => (
                          <SelectField
                            name="liquidity"
                            label={t("assets.form.liquidity")}
                            value={field.state.value}
                            options={LIQUIDITIES}
                            renderOption={(option) =>
                              t(`enums.liquidity.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("liquidity")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="deposit_insurance">
                        {(field) => (
                          <SelectField
                            name="deposit_insurance"
                            label={t("assets.form.depositInsurance")}
                            value={field.state.value}
                            options={DEPOSIT_INSURANCES}
                            renderOption={(option) =>
                              t(`enums.depositInsurance.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("deposit_insurance")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="rate_value">
                        {(field) => (
                          <PercentField
                            name="rate_value"
                            label={t("assets.form.rateValue")}
                            hint={t("assets.form.rateValueHint")}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("rate_value"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                          />
                        )}
                      </form.Field>
                    </div>
                  </>
                )}

                {archetype === "FIXED_INCOME" && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <form.Field name="instrument_kind">
                        {(field) => (
                          <SelectField
                            name="instrument_kind"
                            label={t("assets.form.instrumentKind")}
                            value={field.state.value}
                            options={INSTRUMENT_KINDS}
                            renderOption={(option) =>
                              t(`enums.instrumentKind.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("instrument_kind")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="issuer_type">
                        {(field) => (
                          <SelectField
                            name="issuer_type"
                            label={t("assets.form.issuerType")}
                            value={field.state.value}
                            options={ISSUER_TYPES}
                            renderOption={(option) =>
                              t(`enums.issuerType.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("issuer_type")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="issuer">
                        {(field) => (
                          <SelectField
                            name="issuer"
                            label={t("assets.form.issuer")}
                            hint={t("assets.form.issuerHint")}
                            value={field.state.value}
                            options={[
                              NO_ISSUER,
                              ...institutions.map((row) => row.id),
                            ]}
                            renderOption={(option) =>
                              option === NO_ISSUER
                                ? t("assets.form.noIssuer")
                                : institutionName(option)
                            }
                            onChange={field.handleChange}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("issuer"),
                            ]}
                          />
                        )}
                      </form.Field>
                      <form.Field name="maturity_date">
                        {(field) => (
                          <TextField
                            name="maturity_date"
                            type="date"
                            label={t("assets.form.maturityDate")}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("maturity_date"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                      <form.Field name="issue_date">
                        {(field) => (
                          <TextField
                            name="issue_date"
                            type="date"
                            label={t("assets.form.issueDate")}
                            hint={t("assets.form.optional")}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("issue_date"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                      <form.Field name="rate_type">
                        {(field) => (
                          <SelectField
                            name="rate_type"
                            label={t("assets.form.rateType")}
                            value={field.state.value}
                            options={RATE_TYPES}
                            renderOption={(option) =>
                              t(`enums.rateType.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("rate_type")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="rate_index">
                        {(field) => (
                          <SelectField
                            name="rate_index"
                            label={t("assets.form.rateIndex")}
                            value={field.state.value}
                            options={RATE_INDEXES}
                            renderOption={(option) =>
                              t(`enums.rateIndex.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("rate_index")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="coupon_rate">
                        {(field) => (
                          <PercentField
                            name="coupon_rate"
                            label={t("assets.form.couponRate")}
                            // Two percent fields sit on this form; without
                            // saying what each is for, the live walk could
                            // not tell them apart either.
                            hint={t("assets.form.couponRateHint")}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("coupon_rate"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                          />
                        )}
                      </form.Field>
                      <form.Field name="coupon_frequency">
                        {(field) => (
                          <SelectField
                            name="coupon_frequency"
                            label={t("assets.form.couponFrequency")}
                            value={field.state.value}
                            options={COUPON_FREQUENCIES}
                            renderOption={(option) =>
                              t(`enums.couponFrequency.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("coupon_frequency")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="deposit_insurance">
                        {(field) => (
                          <SelectField
                            name="deposit_insurance"
                            label={t("assets.form.depositInsurance")}
                            value={field.state.value}
                            options={DEPOSIT_INSURANCES}
                            renderOption={(option) =>
                              t(`enums.depositInsurance.${option}`)
                            }
                            onChange={field.handleChange}
                            errors={fieldErrors("deposit_insurance")}
                          />
                        )}
                      </form.Field>
                      <form.Field name="issuer_name">
                        {(field) => (
                          <TextField
                            name="issuer_name"
                            label={t("assets.form.issuerName")}
                            hint={t("assets.form.optional")}
                            autoComplete="off"
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("issuer_name"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                      <form.Subscribe
                        selector={(state) => state.values.currency}
                      >
                        {(currency) => (
                          <form.Field name="face_value">
                            {(field) => (
                              <MoneyField
                                name="face_value"
                                label={t("assets.form.faceValue")}
                                currency={currency}
                                hint={t("assets.form.optional")}
                                errors={[
                                  ...field.state.meta.errors,
                                  // A nested Money rejection arrives dotted
                                  // (`face_value.amount`); the input is still
                                  // the one place it can land.
                                  ...fieldErrors("face_value"),
                                  ...fieldErrors("face_value.amount"),
                                  ...fieldErrors("face_value.currency"),
                                ]}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                              />
                            )}
                          </form.Field>
                        )}
                      </form.Subscribe>
                      <form.Field name="rate_value">
                        {(field) => (
                          <PercentField
                            name="rate_value"
                            label={t("assets.form.rateValue")}
                            hint={t("assets.form.rateValueHint")}
                            errors={[
                              ...field.state.meta.errors,
                              ...fieldErrors("rate_value"),
                            ]}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                          />
                        )}
                      </form.Field>
                    </div>

                    <div className="space-y-4">
                      <form.Field name="tax_advantaged">
                        {(field) => (
                          <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                            <Switch
                              id="tax_advantaged"
                              checked={field.state.value}
                              onCheckedChange={field.handleChange}
                              aria-describedby="tax-advantaged-hint"
                            />
                            <div className="space-y-1">
                              <Label htmlFor="tax_advantaged">
                                {t("assets.form.taxAdvantaged")}
                              </Label>
                              <p
                                id="tax-advantaged-hint"
                                className="text-xs text-muted-foreground"
                              >
                                {t("assets.form.taxAdvantagedHint")}
                              </p>
                            </div>
                          </div>
                        )}
                      </form.Field>
                      <form.Field name="early_redemption">
                        {(field) => (
                          <div className="flex items-start gap-3">
                            <Switch
                              id="early_redemption"
                              checked={field.state.value}
                              onCheckedChange={field.handleChange}
                            />
                            <Label
                              htmlFor="early_redemption"
                              className="font-normal"
                            >
                              {t("assets.form.earlyRedemption")}
                            </Label>
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </>
                )}

                {archetype === "EXCHANGE_SECURITY" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <form.Field name="security_type">
                      {(field) => (
                        <SelectField
                          name="security_type"
                          label={t("assets.form.securityType")}
                          value={field.state.value}
                          options={SECURITY_TYPES}
                          renderOption={(option) =>
                            t(`enums.securityType.${option}`)
                          }
                          onChange={field.handleChange}
                          errors={fieldErrors("security_type")}
                        />
                      )}
                    </form.Field>
                    <form.Field name="exchange">
                      {(field) => (
                        <SelectField
                          name="exchange"
                          label={t("assets.form.exchange")}
                          value={field.state.value}
                          options={EXCHANGES}
                          renderOption={(code) => code}
                          onChange={field.handleChange}
                          errors={fieldErrors("exchange")}
                        />
                      )}
                    </form.Field>
                    <form.Field name="ticker">
                      {(field) => (
                        <TextField
                          name="ticker"
                          label={t("assets.form.ticker")}
                          autoComplete="off"
                          className="font-mono uppercase"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("ticker"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name="isin">
                      {(field) => (
                        <TextField
                          name="isin"
                          label={t("assets.form.isin")}
                          hint={t("assets.form.optional")}
                          autoComplete="off"
                          className="font-mono"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("isin"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name="pays_distributions">
                      {(field) => (
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <Switch
                            id="pays_distributions"
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                          />
                          <Label
                            htmlFor="pays_distributions"
                            className="font-normal"
                          >
                            {t("assets.form.paysDistributions")}
                          </Label>
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}

                {archetype === "NAV_FUND" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <form.Field name="fund_category">
                      {(field) => (
                        <TextField
                          name="fund_category"
                          label={t("assets.form.fundCategory")}
                          autoComplete="off"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("fund_category"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name="unit_price">
                      {(field) => (
                        <DecimalField
                          name="unit_price"
                          label={t("assets.form.unitPrice")}
                          hint={t("assets.form.optional")}
                          scale={SCALE.unitPrice}
                          integerDigits={INTEGER_DIGITS.unitPrice}
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("unit_price"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                    <form.Field name="management_fee">
                      {(field) => (
                        <PercentField
                          name="management_fee"
                          label={t("assets.form.managementFee")}
                          hint={t("assets.form.optional")}
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("management_fee"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                    <form.Field name="performance_fee">
                      {(field) => (
                        <PercentField
                          name="performance_fee"
                          label={t("assets.form.performanceFee")}
                          hint={t("assets.form.optional")}
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("performance_fee"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                    <form.Field name="redemption_period">
                      {(field) => (
                        <TextField
                          name="redemption_period"
                          label={t("assets.form.redemptionPeriod")}
                          hint={t("assets.form.redemptionPeriodHint")}
                          autoComplete="off"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("redemption_period"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                  </div>
                )}

                {archetype === "CRYPTO" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <form.Field name="symbol">
                      {(field) => (
                        <TextField
                          name="symbol"
                          label={t("assets.form.symbol")}
                          autoComplete="off"
                          className="font-mono uppercase"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("symbol"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name="chain">
                      {(field) => (
                        <TextField
                          name="chain"
                          label={t("assets.form.chain")}
                          hint={t("assets.form.optional")}
                          autoComplete="off"
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("chain"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name="decimals">
                      {(field) => (
                        <IntegerField
                          name="decimals"
                          label={t("assets.form.decimals")}
                          hint={t("assets.form.decimalsHint")}
                          errors={[
                            ...field.state.meta.errors,
                            ...fieldErrors("decimals"),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                    <form.Field name="price_currency">
                      {(field) => (
                        <SelectField
                          name="price_currency"
                          label={t("assets.form.priceCurrency")}
                          value={field.state.value}
                          options={CURRENCIES}
                          renderOption={(code) =>
                            `${code} — ${currencyNames.of(code)}`
                          }
                          onChange={field.handleChange}
                          errors={fieldErrors("price_currency")}
                        />
                      )}
                    </form.Field>
                  </div>
                )}
              </div>
            )}
          </form.Subscribe>

          {/* Tax wrappers are accounts, never assets — stated where a user
              might come looking for their 401(k) or TFSA in this list. */}
          <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("assets.form.wrapperNote")}
          </p>

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
                  onClick={() => void navigate({ to: PATHS.ASSETS })}
                >
                  {t("assets.form.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {asset ? t("assets.form.save") : t("assets.form.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
