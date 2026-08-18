import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "@/forms/FieldError";
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
  INSTITUTION_KINDS,
  type Country,
  type InstitutionKind,
} from "@/schemas/apiEnums";
import {
  createInstitution,
  institutionKeys,
  updateInstitution,
  type Institution,
  type InstitutionRequest,
} from "@/services/institutions";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/** Server keys with an input here; the rest go to the banner, never nowhere. */
const CLAIMED_FIELDS = [
  "name",
  "kinds",
  "country",
  "website",
  "logo",
  "is_self_custody",
] as const;

/**
 * Create and edit are one form: the fields are identical and the differences
 * — defaults, verb, mutation — are exactly what a prop can carry. `kinds` is
 * a checkbox group because the schema types it as a set: an institution is
 * routinely both a bank and a brokerage, and radios would make the common
 * case unrepresentable.
 */
export function InstitutionForm({
  institution,
}: {
  institution?: Institution;
}) {
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

  // Built inside the component so validation messages follow the active
  // language and re-translate when the user switches.
  const schema = useMemo(() => {
    const optionalUrl = z
      .string()
      .trim()
      .refine((value) => value === "" || URL.canParse(value), {
        message: t("institutions.form.errors.url"),
      });

    return z.object({
      name: z.string().trim().min(1, t("institutions.form.errors.name")),
      kinds: z
        .array(z.enum(INSTITUTION_KINDS))
        .min(1, t("institutions.form.errors.kinds")),
      country: z.enum(COUNTRIES),
      website: optionalUrl,
      logo: optionalUrl,
      is_self_custody: z.boolean(),
    });
  }, [t]);

  const mutation = useMutation({
    mutationFn: (body: InstitutionRequest) =>
      institution
        ? updateInstitution(institution.id, body)
        : createInstitution(body),
    onSuccess: (saved) => {
      // The response is the stored truth: seed the detail so an immediate
      // re-edit needs no fetch, then drop every list that might order or
      // filter it differently now.
      queryClient.setQueryData(institutionKeys.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: institutionKeys.all });
      toast.success(
        t(institution ? "structure.saved" : "structure.created", {
          name: saved.name,
        }),
      );
      void navigate({ to: PATHS.INSTITUTIONS });
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

  const form = useForm({
    defaultValues: {
      name: institution?.name ?? "",
      kinds: (institution?.kinds ?? []) as InstitutionKind[],
      country: (institution?.country ?? "BR") as Country,
      website: institution?.website ?? "",
      logo: institution?.logo ?? "",
      is_self_custody: institution?.is_self_custody ?? false,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        await mutation.mutateAsync({
          name: value.name.trim(),
          kinds: value.kinds,
          country: value.country,
          // Empty optional URLs travel as "" — the server stores blank, and
          // omitting them on PATCH would silently keep the old value when the
          // user just cleared the field.
          website: value.website.trim(),
          logo: value.logo.trim(),
          is_self_custody: value.is_self_custody,
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  const kindsServerErrors = serverErrors.fieldErrors.kinds ?? [];
  const countryServerErrors = serverErrors.fieldErrors.country ?? [];
  const selfCustodyServerErrors =
    serverErrors.fieldErrors.is_self_custody ?? [];

  return (
    <form
      noValidate
      aria-labelledby="institution-form-title"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {/* The PageHeader above carries the visible title; this names the form
          landmark for assistive tech without repeating the heading. */}
      <span id="institution-form-title" className="sr-only">
        {institution
          ? t("institutions.form.editTitle")
          : t("institutions.form.createTitle")}
      </span>

      <Card>
        <CardContent className="space-y-6">
          <form.Field name="name">
            {(field) => (
              <TextField
                name={field.name}
                label={t("institutions.form.name")}
                autoComplete="organization"
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

          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="kinds">
              {(field) => {
                const errors = [
                  ...field.state.meta.errors,
                  ...kindsServerErrors,
                ];
                return (
                  <div
                    role="group"
                    aria-labelledby="institution-kinds-label"
                    aria-describedby={
                      errors.length > 0
                        ? "institution-kinds-hint kinds-error"
                        : "institution-kinds-hint"
                    }
                    className="space-y-3"
                  >
                    <span
                      id="institution-kinds-label"
                      className="block text-sm font-medium"
                    >
                      {t("institutions.form.kinds")}
                    </span>
                    <p
                      id="institution-kinds-hint"
                      className="text-xs text-muted-foreground"
                    >
                      {t("institutions.form.kindsHint")}
                    </p>
                    {INSTITUTION_KINDS.map((kind) => (
                      <div key={kind} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`kind-${kind}`}
                          checked={field.state.value.includes(kind)}
                          onCheckedChange={(checked) =>
                            field.handleChange(
                              checked === true
                                ? [...field.state.value, kind]
                                : field.state.value.filter((k) => k !== kind),
                            )
                          }
                        />
                        <Label htmlFor={`kind-${kind}`} className="font-normal">
                          {t(`enums.kind.${kind}`)}
                        </Label>
                      </div>
                    ))}
                    <FieldError id="kinds-error" errors={errors} />
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="country">
              {(field) => (
                <div className="space-y-3">
                  <span
                    id="institution-country-label"
                    className="block text-sm font-medium"
                  >
                    {t("institutions.form.country")}
                  </span>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as Country)
                    }
                    aria-labelledby="institution-country-label"
                    aria-describedby={
                      countryServerErrors.length > 0
                        ? "country-error"
                        : undefined
                    }
                    aria-invalid={countryServerErrors.length > 0}
                  >
                    {COUNTRIES.map((code) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <RadioGroupItem id={`country-${code}`} value={code} />
                        <Label
                          htmlFor={`country-${code}`}
                          className="font-normal"
                        >
                          {regionNames.of(code)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FieldError id="country-error" errors={countryServerErrors} />
                </div>
              )}
            </form.Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="website">
              {(field) => (
                <TextField
                  name={field.name}
                  type="url"
                  label={t("institutions.form.website")}
                  hint={t("institutions.form.optional")}
                  placeholder="https://"
                  errors={[
                    ...field.state.meta.errors,
                    ...(serverErrors.fieldErrors.website ?? []),
                  ]}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>

            <form.Field name="logo">
              {(field) => (
                <TextField
                  name={field.name}
                  type="url"
                  label={t("institutions.form.logo")}
                  hint={t("institutions.form.optional")}
                  placeholder="https://"
                  errors={[
                    ...field.state.meta.errors,
                    ...(serverErrors.fieldErrors.logo ?? []),
                  ]}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>
          </div>

          <form.Field name="is_self_custody">
            {(field) => (
              <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                <Switch
                  id="is_self_custody"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  aria-describedby="self-custody-hint"
                />
                <div className="space-y-1">
                  <Label htmlFor="is_self_custody">
                    {t("institutions.form.selfCustody")}
                  </Label>
                  <p
                    id="self-custody-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t("institutions.form.selfCustodyHint")}
                  </p>
                  <FieldError
                    id="self-custody-error"
                    errors={selfCustodyServerErrors}
                  />
                </div>
              </div>
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
                  onClick={() => void navigate({ to: PATHS.INSTITUTIONS })}
                >
                  {t("institutions.form.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <IconLoader2 className="animate-spin" aria-hidden />
                  )}
                  {institution
                    ? t("institutions.form.save")
                    : t("institutions.form.create")}
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  );
}
