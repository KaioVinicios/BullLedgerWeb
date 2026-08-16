/**
 * Recording one price for one asset on one date.
 *
 * Three fields, and each is narrower than it looks. The asset select is
 * restricted by `pricing_mode`, the server's own read-only discriminator — so
 * "a price on a savings account" is unofferable rather than rejected, and no
 * archetype list is restated here to say so. The date is a real-world calendar
 * date, immune to timezone drift. And the price is a decimal string at the
 * schema's scale, parsed from the reader's locale and canonicalized only at
 * submit: it is a **price, not Money**, so it never goes near `MoneyField` or
 * minor units.
 *
 * There is no edit or delete twin, because the table is insert-only: a second
 * value for a date that already has one is a 400 keyed on `non_field_errors`,
 * and the banner is where the user reads that.
 */
import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DecimalField } from "@/forms/DecimalField";
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
import { assetKeys, listAssets, type Asset } from "@/services/assets";
import {
  createPriceQuote,
  invalidatePricing,
  type PriceQuoteRequest,
} from "@/services/pricing";
import { toCalendarDate, todayCalendarDate } from "@/utils/date";
import { INTEGER_DIGITS, parseDecimalInput, SCALE } from "@/utils/decimal";

const route = getRouteApi(PATHS.PRICING_NEW);

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Server keys with an input here; the rest go to the banner, never nowhere. */
const CLAIMED_FIELDS = ["asset", "date", "price"] as const;

const LIVE = {} as const;

export function PriceQuoteForm() {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const search = route.useSearch();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const { data: assets } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  // `pricing_mode` is readOnly on every member of the Asset union, so this
  // needs no narrowing.
  const priceable: Asset[] = useMemo(
    () =>
      (assets?.results ?? []).filter(
        (asset) => asset.pricing_mode !== "ACCRUAL",
      ),
    [assets],
  );

  // A prefill naming an asset that cannot be priced is dropped rather than
  // pre-selected: staging a rejection is worse than asking the question.
  const prefill = priceable.some((asset) => asset.id === search.asset)
    ? (search.asset ?? "")
    : "";

  const schema = useMemo(
    () =>
      z.object({
        asset: z.string().min(1, t("pricing.form.errors.asset")),
        date: z.string().refine((value) => toCalendarDate(value) !== null, {
          message: t("pricing.form.errors.date"),
        }),
        price: z
          .string()
          .refine(
            (value) =>
              parseDecimalInput(value, locale, SCALE.unitPrice) !== null,
            { message: t("pricing.form.errors.price") },
          ),
      }),
    [t, locale],
  );

  const mutation = useMutation({
    mutationFn: (body: PriceQuoteRequest) => createPriceQuote(body),
    onSuccess: async (saved) => {
      await invalidatePricing(queryClient);
      const name = priceable.find((asset) => asset.id === saved.asset)?.name;
      toast.success(t("pricing.form.created", { name: name ?? "" }));
      // Back to the list filtered to this asset, so the row just recorded is
      // the first thing on screen.
      void navigate({ to: PATHS.PRICING, search: { asset: saved.asset } });
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
      asset: prefill,
      date: todayCalendarDate() as string,
      price: "",
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      const price = parseDecimalInput(value.price, locale, SCALE.unitPrice);
      const date = toCalendarDate(value.date);
      if (price === null || date === null) return;

      try {
        await mutation.mutateAsync({ asset: value.asset, date, price });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  return (
    <form
      noValidate
      aria-labelledby="price-quote-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {/* The PageHeader above carries the visible title; this names the form
          landmark for assistive tech without repeating the heading. */}
      <span id="price-quote-form-title" className="sr-only">
        {t("pricing.form.createTitle")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          <form.Field name="asset">
            {(field) => {
              const selected = priceable.find(
                (asset) => asset.id === field.state.value,
              );

              return (
                <div className="space-y-2">
                  <SelectField
                    name="asset"
                    label={t("pricing.form.asset")}
                    emptyLabel={t("pricing.form.assetEmpty")}
                    hint={t("pricing.form.assetHint")}
                    value={field.state.value}
                    options={priceable.map((asset) => asset.id)}
                    renderOption={(id) =>
                      priceable.find((asset) => asset.id === id)?.name ?? id
                    }
                    onChange={field.handleChange}
                    errors={[
                      ...field.state.meta.errors,
                      ...(serverErrors.fieldErrors.asset ?? []),
                    ]}
                  />
                  {/* How the asset is priced is a fact about it, not a choice
                      here — so it reads as a badge, the way AssetForm renders
                      archetype on edit. */}
                  {selected && (
                    <Badge variant="secondary">
                      {t(`enums.pricingMode.${selected.pricing_mode}`)}
                    </Badge>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="date">
            {(field) => (
              <TextField
                name={field.name}
                type="date"
                label={t("pricing.form.date")}
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.date ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.asset}>
            {(assetId) => {
              const selected = priceable.find((asset) => asset.id === assetId);

              return (
                <form.Field name="price">
                  {(field) => (
                    <DecimalField
                      name={field.name}
                      scale={SCALE.unitPrice}
                      integerDigits={INTEGER_DIGITS.unitPrice}
                      label={t("pricing.form.price")}
                      // The currency rides beside the input rather than inside
                      // the value: it follows the asset, and is not the user's
                      // to type.
                      hint={selected?.currency}
                      errors={[
                        ...field.state.meta.errors,
                        ...(serverErrors.fieldErrors.price ?? []),
                      ]}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>
              );
            }}
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
                  onClick={() => void navigate({ to: PATHS.PRICING })}
                >
                  {t("pricing.form.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {t("pricing.form.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
