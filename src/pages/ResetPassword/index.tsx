import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/FormError";
import { TextField } from "@/forms/TextField";
import {
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { authLink } from "@/pages/Auth/authLink";
import { PATHS } from "@/routes/path";
import { requestPasswordReset } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/**
 * Asks for a reset link.
 *
 * No guard: this page exists precisely for someone who cannot sign in.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const { t: tError } = useTranslation("errors");
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const schema = useMemo(
    () => z.object({ email: z.email({ message: t("errors.email") }) }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? translateServerErrors(error, tError, locale)
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        await mutation.mutateAsync({ email: value.email });
      } catch {
        // Already rendered by onError.
      }
    },
  });

  // Deliberately non-committal: confirming whether an address is registered
  // would turn this form into an account-enumeration oracle.
  if (mutation.isSuccess) {
    return (
      <AuthShell>
        <div className="mt-10 space-y-4">
          <h1 className="text-3xl">{t("resetRequest.sentTitle")}</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("resetRequest.sentBody")}
          </p>
          <Button asChild size="lg" variant="outline" className="mt-2">
            <Link to={PATHS.LOGIN}>{t("resetRequest.backToLogin")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mt-10">
        <h1 className="text-3xl">{t("resetRequest.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("resetRequest.subtitle")}
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="mt-8 space-y-4"
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
                  {t("resetRequest.submitting")}
                </>
              ) : (
                t("resetRequest.submit")
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to={PATHS.LOGIN} className={authLink}>
          {t("resetRequest.backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
