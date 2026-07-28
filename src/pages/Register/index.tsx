import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/FormError";
import { FieldError } from "@/forms/FieldError";
import { PasswordField } from "@/forms/PasswordField";
import { TextField } from "@/forms/TextField";
import {
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { env } from "@/config/env";
import { ApiClientError } from "@/lib/apiError";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { TrustPanel } from "@/pages/Auth/TrustPanel";
import { authLink } from "@/pages/Auth/authLink";
import { GoogleSignIn } from "@/pages/Auth/GoogleSignIn";
import { PATHS } from "@/routes/path";
import { registerRoute } from "@/routes/router";
import { currentUserQuery, register } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

// The divider only reads as a divider when there is something above it to
// divide from. Without Google configured, "or continue with email" would sit
// over an empty gap.
const googleEnabled = Boolean(env.VITE_GOOGLE_CLIENT_ID);

export function RegisterPage() {
  const { t } = useTranslation("auth");
  // A second scoped `t`: the auth-scoped one cannot reach another namespace.
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = registerRoute.useSearch();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  // Built inside the component so validation messages follow the active
  // language and re-translate when the user switches.
  const registerSchema = useMemo(
    () =>
      z
        .object({
          email: z.email({ message: t("errors.email") }),
          password: z.string().min(8, { message: t("errors.passwordMin") }),
          passwordConfirm: z.string(),
          acceptTerms: z
            .boolean()
            .refine((v) => v === true, { message: t("errors.acceptTerms") }),
        })
        .refine((v) => v.password === v.passwordConfirm, {
          message: t("errors.passwordMismatch"),
          // Lands on the confirm input rather than the form, because that is
          // the field the user needs to fix.
          path: ["passwordConfirm"],
        }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async () => {
      // Cookies are set, but the 201 body is just { email, reporting_currency }
      // — no user object, unlike login. Ask the server who arrived rather than
      // inventing a user from the form values.
      await queryClient.fetchQuery(currentUserQuery);
      await navigate({ href: search.redirect ?? PATHS.APP });
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? translateServerErrors(error, tError)
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      acceptTerms: false,
    },
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        await mutation.mutateAsync({
          email: value.email,
          password1: value.password,
          password2: value.passwordConfirm,
          // Phase 4 owns the profile screen; registration sends the schema
          // default and nothing more.
          reporting_currency: "BRL",
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  return (
    // The only auth screen that still has to earn the visitor: they are
    // deciding here, so the product preview sits beside the decision.
    <AuthShell aside={<TrustPanel />}>
      <div className="mt-10">
        <h1 className="text-3xl">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("register.subtitle")}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <GoogleSignIn
          onError={(message) =>
            setServerErrors({ fieldErrors: {}, formErrors: [message] })
          }
        />

        {googleEnabled && (
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {t("divider.registerEmail")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="email">
            {(field) => (
              <TextField
                name={field.name}
                label={t("fields.email")}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t("fields.emailPlaceholder")}
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.email ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <PasswordField
                name={field.name}
                label={t("fields.password")}
                autoComplete="new-password"
                placeholder={t("fields.passwordCreatePlaceholder")}
                hint={t("fields.passwordHint")}
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.password1 ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="passwordConfirm">
            {(field) => (
              <PasswordField
                name={field.name}
                label={t("fields.passwordConfirm")}
                autoComplete="new-password"
                placeholder={t("fields.passwordConfirmPlaceholder")}
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.password2 ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="acceptTerms">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={(checked) =>
                        field.handleChange(checked === true)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={invalid}
                      aria-describedby={
                        invalid ? `${field.name}-error` : undefined
                      }
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={field.name}
                      className="text-sm leading-snug text-muted-foreground select-none"
                    >
                      <Trans
                        t={t}
                        i18nKey="terms.agreement"
                        components={{
                          terms: <Link to={PATHS.TERMS} className={authLink} />,
                          privacy: (
                            <Link to={PATHS.PRIVACY} className={authLink} />
                          ),
                        }}
                      />
                    </label>
                  </div>
                  <FieldError
                    id={`${field.name}-error`}
                    errors={field.state.meta.errors}
                  />
                </div>
              );
            }}
          </form.Field>

          <FormError errors={serverErrors.formErrors} />

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    {t("register.submitting")}
                  </>
                ) : (
                  t("register.submit")
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link to={PATHS.LOGIN} className={authLink}>
          {t("register.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
