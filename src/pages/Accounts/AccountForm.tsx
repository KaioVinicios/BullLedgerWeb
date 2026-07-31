import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { PATHS } from "@/routes/path";
import {
  COUNTRIES,
  CURRENCIES,
  CURRENCY_BY_COUNTRY,
  REGISTRATIONS,
  REGISTRATIONS_BY_COUNTRY,
  TAX_REGIMES,
  TAXED_ON,
  isAccountAdvantaged,
  isBrPrev,
  planTypeOf,
  type Country,
  type Currency,
  type Registration,
  type TaxRegime,
  type TaxedOn,
} from "@/schemas/apiEnums";
import {
  accountKeys,
  createAccount,
  updateAccount,
  type Account,
  type AccountRequest,
} from "@/services/accounts";
import { institutionKeys, listInstitutions } from "@/services/institutions";
import { minorUnitsToDecimalString, parseMoneyInput } from "@/utils/money";
import { formatNumericString } from "@/utils/intl";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Radix select values are strings; the account's fourth state is null. */
const NO_INSTITUTION = "none";

/**
 * Server keys with an input here; the rest — `plan_type` included, which is
 * derived rather than asked — go to the banner via `claimFieldErrors`.
 */
const CLAIMED_FIELDS = [
  "name",
  "institution",
  "country",
  "registration",
  "base_currency",
  "account_number",
  "contribution_room",
  "deductible",
  "tax_regime",
  "taxed_on",
] as const;

/**
 * Country comes first and registration derives from it: the options offered
 * are exactly `REGISTRATIONS_BY_COUNTRY[country]`, so the invalid pairing
 * `business-rules.md` warns about cannot be expressed, only received from a
 * stale server state. Where tax advantage attaches is said in the form's own
 * flow — a note under US/CA advantaged registrations, the instrument-level
 * note under BR taxable, and the PGBL/VGBL hybrid's fields under BR_PREV.
 */
export function AccountForm({ account }: { account?: Account }) {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const regionNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: "region" }),
    [locale],
  );
  const currencyNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: "currency" }),
    [locale],
  );

  // Only live institutions are assignable; an archived one keeps labelling
  // existing accounts but does not take new ones.
  const institutionsQuery = {};
  const { data: institutionsPage } = useQuery({
    queryKey: institutionKeys.list(institutionsQuery),
    queryFn: () => listInstitutions(institutionsQuery),
  });
  const institutions = institutionsPage?.results ?? [];

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("accounts.form.errors.name")),
        institution: z.string(),
        country: z.enum(COUNTRIES),
        registration: z.enum(REGISTRATIONS),
        base_currency: z.enum(CURRENCIES),
        account_number: z.string(),
        contribution_room: z.string().refine(
          // Currency does not affect parseability; USD stands in for "any".
          (value) =>
            value.trim() === "" ||
            parseMoneyInput(value, "USD", locale) !== null,
          { message: t("accounts.form.errors.money") },
        ),
        deductible: z.boolean(),
        tax_regime: z.enum(TAX_REGIMES),
        taxed_on: z.enum(TAXED_ON),
      }),
    [t, locale],
  );

  const mutation = useMutation({
    mutationFn: (body: AccountRequest) =>
      account ? updateAccount(account.id, body) : createAccount(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(accountKeys.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      toast.success(
        t(account ? "structure.saved" : "structure.created", {
          name: saved.name,
        }),
      );
      void navigate({ to: PATHS.ACCOUNTS });
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
    defaultValues: {
      name: account?.name ?? "",
      institution: account?.institution ?? NO_INSTITUTION,
      country: (account?.country ?? "BR") as Country,
      registration: (account?.registration ??
        REGISTRATIONS_BY_COUNTRY.BR[0]) as Registration,
      base_currency: (account?.base_currency ?? "BRL") as Currency,
      account_number: account?.account_number ?? "",
      contribution_room: account?.contribution_room
        ? formatNumericString(
            new Intl.NumberFormat(locale, {
              useGrouping: false,
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }),
            minorUnitsToDecimalString(account.contribution_room.amount),
          )
        : "",
      deductible: account?.deductible ?? false,
      tax_regime: (account?.tax_regime ?? "PROGRESSIVE") as TaxRegime,
      taxed_on: (account?.taxed_on ?? "WHOLE_AMOUNT") as TaxedOn,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);

      const registration = value.registration;
      const advantaged = isAccountAdvantaged(registration);
      const brPrev = isBrPrev(registration);
      const room = value.contribution_room.trim();

      try {
        // Inapplicable tax fields travel as explicit nulls, not absences: a
        // registration change must clear what the old one had set, and an
        // omitted key on PATCH silently keeps it.
        await mutation.mutateAsync({
          name: value.name.trim(),
          institution:
            value.institution === NO_INSTITUTION ? null : value.institution,
          country: value.country,
          registration,
          base_currency: value.base_currency,
          account_number: value.account_number.trim(),
          contribution_room:
            advantaged && room !== ""
              ? parseMoneyInput(room, value.base_currency, locale)
              : null,
          plan_type: planTypeOf(registration),
          deductible: brPrev ? value.deductible : null,
          tax_regime: brPrev ? value.tax_regime : null,
          taxed_on: brPrev ? value.taxed_on : null,
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  const registrationServerErrors = serverErrors.fieldErrors.registration ?? [];
  const countryServerErrors = serverErrors.fieldErrors.country ?? [];
  const currencyServerErrors = serverErrors.fieldErrors.base_currency ?? [];
  const institutionServerErrors = serverErrors.fieldErrors.institution ?? [];

  return (
    <form
      noValidate
      aria-labelledby="account-form-title"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <span id="account-form-title" className="sr-only">
        {account
          ? t("accounts.form.editTitle")
          : t("accounts.form.createTitle")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          <form.Field name="name">
            {(field) => (
              <TextField
                name={field.name}
                label={t("accounts.form.name")}
                autoComplete="off"
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.name ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="institution">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="institution">
                  {t("accounts.form.institution")}
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger
                    id="institution"
                    className="w-full"
                    aria-describedby="institution-hint"
                    aria-invalid={institutionServerErrors.length > 0}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_INSTITUTION}>
                      {t("accounts.form.noInstitution")}
                    </SelectItem>
                    {institutions.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p
                  id="institution-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t("accounts.form.institutionHint")}
                </p>
                <FieldError
                  id="institution-error"
                  errors={institutionServerErrors}
                />
              </div>
            )}
          </form.Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="country">
              {(field) => (
                <div className="space-y-3">
                  <span
                    id="account-country-label"
                    className="block text-sm font-medium"
                  >
                    {t("accounts.form.country")}
                  </span>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(value) => {
                      const country = value as Country;
                      field.handleChange(country);
                      // A country decides which registrations exist; the old
                      // selection may no longer be offerable.
                      form.setFieldValue(
                        "registration",
                        REGISTRATIONS_BY_COUNTRY[country][0],
                      );
                      // And it decides the currency the books are kept in —
                      // a default the user can move back, not a lock.
                      form.setFieldValue(
                        "base_currency",
                        CURRENCY_BY_COUNTRY[country],
                      );
                    }}
                    aria-labelledby="account-country-label"
                    aria-invalid={countryServerErrors.length > 0}
                    aria-describedby={
                      countryServerErrors.length > 0
                        ? "account-country-error"
                        : undefined
                    }
                  >
                    {COUNTRIES.map((code) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <RadioGroupItem
                          id={`account-country-${code}`}
                          value={code}
                        />
                        <Label
                          htmlFor={`account-country-${code}`}
                          className="font-normal"
                        >
                          {regionNames.of(code)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FieldError
                    id="account-country-error"
                    errors={countryServerErrors}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="base_currency">
              {(field) => (
                <div className="space-y-3">
                  <span
                    id="account-currency-label"
                    className="block text-sm font-medium"
                  >
                    {t("accounts.form.currency")}
                  </span>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as Currency)
                    }
                    aria-labelledby="account-currency-label"
                    aria-invalid={currencyServerErrors.length > 0}
                    aria-describedby={
                      currencyServerErrors.length > 0
                        ? "account-currency-error"
                        : undefined
                    }
                  >
                    {CURRENCIES.map((code) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <RadioGroupItem
                          id={`account-currency-${code}`}
                          value={code}
                        />
                        <Label
                          htmlFor={`account-currency-${code}`}
                          className="font-normal"
                        >
                          {code} — {currencyNames.of(code)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FieldError
                    id="account-currency-error"
                    errors={currencyServerErrors}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.country}>
            {(country) => (
              <form.Field name="registration">
                {(field) => (
                  <div className="space-y-3">
                    <span
                      id="account-registration-label"
                      className="block text-sm font-medium"
                    >
                      {t("accounts.form.registration")}
                    </span>
                    <RadioGroup
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as Registration)
                      }
                      aria-labelledby="account-registration-label"
                      aria-invalid={registrationServerErrors.length > 0}
                      aria-describedby={
                        registrationServerErrors.length > 0
                          ? "account-registration-error"
                          : undefined
                      }
                    >
                      {REGISTRATIONS_BY_COUNTRY[country].map((code) => (
                        <div key={code} className="flex items-center gap-2.5">
                          <RadioGroupItem
                            id={`registration-${code}`}
                            value={code}
                          />
                          <Label
                            htmlFor={`registration-${code}`}
                            className="font-normal"
                          >
                            {t(`enums.registration.${code}`)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <FieldError
                      id="account-registration-error"
                      errors={registrationServerErrors}
                    />
                  </div>
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Field name="account_number">
            {(field) => (
              <TextField
                name={field.name}
                label={t("accounts.form.accountNumber")}
                hint={t("accounts.form.optional")}
                autoComplete="off"
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.account_number ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [state.values.registration, state.values.base_currency] as const
            }
          >
            {([registration, baseCurrency]) => (
              <>
                {isAccountAdvantaged(registration) && (
                  <div className="space-y-4">
                    <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      <IconInfoCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {t("accounts.form.accountAdvantageNote")}
                    </p>
                    <form.Field name="contribution_room">
                      {(field) => (
                        <MoneyField
                          name={field.name}
                          label={t("accounts.form.contributionRoom")}
                          currency={baseCurrency}
                          hint={t("accounts.form.contributionRoomHint")}
                          errors={[
                            ...field.state.meta.errors,
                            // A nested Money rejection arrives dotted; the
                            // input is still the one place it can land.
                            ...(serverErrors.fieldErrors.contribution_room ??
                              []),
                            ...(serverErrors.fieldErrors[
                              "contribution_room.amount"
                            ] ?? []),
                            ...(serverErrors.fieldErrors[
                              "contribution_room.currency"
                            ] ?? []),
                          ]}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                  </div>
                )}

                {registration === "BR_TAXABLE" && (
                  <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    <IconInfoCircle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    {t("accounts.form.instrumentAdvantageNote")}
                  </p>
                )}

                {isBrPrev(registration) && (
                  <div className="space-y-4">
                    <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      <IconInfoCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {t("accounts.form.prevNote", {
                        plan: planTypeOf(registration),
                      })}
                    </p>

                    <form.Field name="deductible">
                      {(field) => (
                        <div className="flex items-start gap-3">
                          <Switch
                            id="deductible"
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                            aria-describedby="deductible-hint"
                          />
                          <div className="space-y-1">
                            <Label htmlFor="deductible">
                              {t("accounts.form.deductible")}
                            </Label>
                            <p
                              id="deductible-hint"
                              className="text-xs text-muted-foreground"
                            >
                              {t("accounts.form.deductibleHint")}
                            </p>
                          </div>
                        </div>
                      )}
                    </form.Field>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <form.Field name="tax_regime">
                        {(field) => (
                          <div className="space-y-3">
                            <span
                              id="tax-regime-label"
                              className="block text-sm font-medium"
                            >
                              {t("accounts.form.taxRegime")}
                            </span>
                            <RadioGroup
                              value={field.state.value}
                              onValueChange={(value) =>
                                field.handleChange(value as TaxRegime)
                              }
                              aria-labelledby="tax-regime-label"
                            >
                              {TAX_REGIMES.map((code) => (
                                <div
                                  key={code}
                                  className="flex items-center gap-2.5"
                                >
                                  <RadioGroupItem
                                    id={`tax-regime-${code}`}
                                    value={code}
                                  />
                                  <Label
                                    htmlFor={`tax-regime-${code}`}
                                    className="font-normal"
                                  >
                                    {t(`enums.taxRegime.${code}`)}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="taxed_on">
                        {(field) => (
                          <div className="space-y-3">
                            <span
                              id="taxed-on-label"
                              className="block text-sm font-medium"
                            >
                              {t("accounts.form.taxedOn")}
                            </span>
                            <RadioGroup
                              value={field.state.value}
                              onValueChange={(value) =>
                                field.handleChange(value as TaxedOn)
                              }
                              aria-labelledby="taxed-on-label"
                            >
                              {TAXED_ON.map((code) => (
                                <div
                                  key={code}
                                  className="flex items-center gap-2.5"
                                >
                                  <RadioGroupItem
                                    id={`taxed-on-${code}`}
                                    value={code}
                                  />
                                  <Label
                                    htmlFor={`taxed-on-${code}`}
                                    className="font-normal"
                                  >
                                    {t(`enums.taxedOn.${code}`)}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>
                )}
              </>
            )}
          </form.Subscribe>

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
                  onClick={() => void navigate({ to: PATHS.ACCOUNTS })}
                >
                  {t("accounts.form.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {account
                    ? t("accounts.form.save")
                    : t("accounts.form.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
