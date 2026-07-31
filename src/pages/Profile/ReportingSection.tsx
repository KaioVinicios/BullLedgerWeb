import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldError } from "@/forms/FieldError";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import {
  profileKeys,
  updateProfile,
  type Profile,
  type ProfileUpdate,
} from "@/services/profile";
import { PORTFOLIO_KEY } from "@/services/queryKeys";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** The schema's `CurrencyEnum`. */
const CURRENCIES = ["BRL", "USD", "CAD"] as const;

/** The schema's `CountryEnum`. Each maps to the index that deflates its gains. */
const COUNTRIES = ["BR", "CA", "US"] as const;

/**
 * Radix radio values are strings, and this field's fourth state is `null`.
 * A sentinel keeps that mapping in one place instead of spreading empty-string
 * checks through the JSX.
 */
const NO_INFLATION = "none";

/**
 * How figures are read — the only two settings in the application that change
 * what every screen shows without changing a single recorded fact.
 *
 * That distinction is the whole design problem here, and it is stated twice:
 * once before the change, in a note the currency group points at with
 * `aria-describedby`, and once after it, in the toast. Not three times, and
 * not with a confirmation dialog — an explicit Save is already the gate, and a
 * second gate for one decision teaches people to click through both.
 *
 * Currency and country names come from `Intl.DisplayNames` rather than the
 * locale files: three currencies and four countries across two languages is
 * fourteen hand-translated strings that could drift from what the rest of the
 * app calls the same things. Only the index names (IPCA, CPI, PCE) and "None"
 * are authored, because nothing can derive those.
 */
export function ReportingSection({ profile }: { profile: Profile }) {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const names = useMemo(
    () => ({
      currency: new Intl.DisplayNames(locale, { type: "currency" }),
      region: new Intl.DisplayNames(locale, { type: "region" }),
    }),
    [locale],
  );

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.profile(), updated);
      // The rule `services/queryKeys.ts` documents, executed: every projection
      // is read through this preference, so the whole root goes at once.
      // Coarse on purpose — a stale total is a correctness bug, an extra
      // refetch is not.
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      toast.success(
        t("profile.saved.reporting", {
          currency: names.currency.of(updated.reporting_currency ?? "BRL"),
        }),
      );
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? claimFieldErrors(translateServerErrors(error, tError), [
              "reporting_currency",
              "inflation_reference_country",
            ])
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      reporting_currency: profile.reporting_currency ?? "BRL",
      inflation_reference: (profile.inflation_reference_country ??
        NO_INFLATION) as (typeof COUNTRIES)[number] | typeof NO_INFLATION,
    },
    onSubmit: async ({ value, formApi }) => {
      setServerErrors(NO_SERVER_ERRORS);

      const body: ProfileUpdate = {
        reporting_currency: value.reporting_currency,
        inflation_reference_country:
          value.inflation_reference === NO_INFLATION
            ? null
            : value.inflation_reference,
      };

      try {
        const updated = await mutation.mutateAsync(body);
        formApi.reset({
          reporting_currency: updated.reporting_currency ?? "BRL",
          inflation_reference:
            updated.inflation_reference_country ?? NO_INFLATION,
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  const currencyErrors = serverErrors.fieldErrors.reporting_currency ?? [];
  const inflationErrors =
    serverErrors.fieldErrors.inflation_reference_country ?? [];

  return (
    // Named, for the reason `IdentitySection` is: two forms on one screen.
    <form
      noValidate
      aria-labelledby="reporting-title"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle id="reporting-title">
            {t("profile.reporting.title")}
          </CardTitle>
          <CardDescription>
            {t("profile.reporting.description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <p
            id="reporting-lens"
            className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground"
          >
            <IconInfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("profile.reporting.lens")}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="reporting_currency">
              {(field) => (
                // A plain div rather than a grouping element: Radix's
                // RadioGroup already renders role="radiogroup", so wrapping it
                // would nest a second group naming itself off the same text,
                // announced twice on the way in.
                <div className="space-y-3">
                  <span
                    id="reporting-currency-label"
                    className="block text-sm font-medium"
                  >
                    {t("profile.reporting.currency")}
                  </span>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as (typeof CURRENCIES)[number])
                    }
                    aria-labelledby="reporting-currency-label"
                    aria-describedby={
                      currencyErrors.length > 0
                        ? "reporting-lens reporting-currency-error"
                        : "reporting-lens"
                    }
                    aria-invalid={currencyErrors.length > 0}
                  >
                    {CURRENCIES.map((code) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <RadioGroupItem id={`currency-${code}`} value={code} />
                        <Label
                          htmlFor={`currency-${code}`}
                          className="font-normal"
                        >
                          {code} — {names.currency.of(code)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FieldError
                    id="reporting-currency-error"
                    errors={currencyErrors}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="inflation_reference">
              {(field) => (
                <div className="space-y-3">
                  <span
                    id="reporting-inflation-label"
                    className="block text-sm font-medium"
                  >
                    {t("profile.reporting.inflation")}
                  </span>
                  {/* Above the options, not below them. `aria-describedby`
                      scopes this to the whole group, and sitting under the
                      last option made it read as a note about "None" — which
                      is the one option it would contradict. */}
                  <p
                    id="reporting-inflation-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t("profile.reporting.inflationHint")}
                  </p>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        value as (typeof COUNTRIES)[number] | "none",
                      )
                    }
                    aria-labelledby="reporting-inflation-label"
                    aria-describedby={
                      inflationErrors.length > 0
                        ? "reporting-inflation-hint reporting-inflation-error"
                        : "reporting-inflation-hint"
                    }
                    aria-invalid={inflationErrors.length > 0}
                  >
                    {COUNTRIES.map((code) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <RadioGroupItem id={`inflation-${code}`} value={code} />
                        <Label
                          htmlFor={`inflation-${code}`}
                          className="font-normal"
                        >
                          {names.region.of(code)} —{" "}
                          {t(`profile.reporting.index.${code}`)}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center gap-2.5">
                      <RadioGroupItem
                        id="inflation-none"
                        value={NO_INFLATION}
                      />
                      <Label htmlFor="inflation-none" className="font-normal">
                        {t("profile.reporting.noInflation")}
                      </Label>
                    </div>
                  </RadioGroup>
                  <FieldError
                    id="reporting-inflation-error"
                    errors={inflationErrors}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <FormError errors={serverErrors.formErrors} />
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <form.Subscribe
            selector={(state) => [state.isDirty, state.isSubmitting] as const}
          >
            {([isDirty, isSubmitting]) => (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!isDirty || isSubmitting}
                  onClick={() => form.reset()}
                >
                  {t("profile.actions.discard")}
                </Button>
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {isSubmitting
                    ? t("profile.actions.saving")
                    : t("profile.actions.save")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
