import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/FormError";
import { PasswordField } from "@/forms/PasswordField";
import { TextField } from "@/forms/TextField";
import {
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { env } from "@/config/env";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { authLink, authLinkQuiet } from "@/pages/Auth/authLink";
import { GoogleSignIn } from "@/pages/Auth/GoogleSignIn";
import { PATHS } from "@/routes/path";
import { loginRoute } from "@/routes/router";
import { authKeys, login } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

// The divider only reads as a divider when there is something above it to
// divide from. Without Google configured, "or sign in with email" would sit
// over an empty gap.
const googleEnabled = Boolean(env.VITE_GOOGLE_CLIENT_ID);

export function LoginPage() {
  const { t } = useTranslation("auth");
  // A second scoped `t`: the auth-scoped one cannot reach another namespace.
  const { t: tError } = useTranslation("errors");
  const locale = useFormatLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = loginRoute.useSearch();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email({ message: t("errors.email") }),
        password: z.string().min(1, { message: t("errors.passwordRequired") }),
        rememberMe: z.boolean(),
      }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      // Login answers with the full user, so the cache is seeded directly and
      // the app needs no second round trip to know who just arrived.
      queryClient.setQueryData(authKeys.user(), data.user);
      // `href` rather than `to`: the destination is a runtime string the
      // router cannot know at compile time. `redirectSchema` has already
      // proven it is same-origin, which is what makes this safe.
      await navigate({ href: search.redirect ?? PATHS.APP });
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? translateServerErrors(error, tError, locale)
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: { email: "", password: "", rememberMe: false },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        await mutation.mutateAsync({
          email: value.email,
          password: value.password,
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  return (
    <AuthShell>
      <div className="mt-10">
        <h1 className="text-3xl">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("login.subtitle")}
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
              {t("divider.loginEmail")}
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
                autoComplete="current-password"
                placeholder={t("fields.passwordPlaceholder")}
                // Recovery belongs to the field it recovers, not to the form's
                // footer: someone reaches for it while looking at the password
                // box, and that is where it now sits.
                labelAction={
                  <Link to={PATHS.RESET_PASSWORD} className={authLinkQuiet}>
                    {t("login.forgotPassword")}
                  </Link>
                }
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.password ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          {/*
            A session preference, alone on its row. It used to share one with
            the recovery link under `justify-between`, which grouped two
            unrelated things by convenience and left each about half the column:
            both wrapped to two lines in English at full desktop width, and
            worse in Portuguese. Given the whole measure, each fits on one.
          */}
          <form.Field name="rememberMe">
            {(field) => (
              <div className="flex items-center gap-2.5 pt-1">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                  onBlur={field.handleBlur}
                />
                <Label
                  htmlFor={field.name}
                  className="font-normal text-muted-foreground"
                >
                  {t("login.rememberMe")}
                </Label>
              </div>
            )}
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
                    {t("login.submitting")}
                  </>
                ) : (
                  t("login.submit")
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link to={PATHS.REGISTER} className={authLink}>
          {t("login.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
