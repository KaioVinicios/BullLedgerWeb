import { useEffect, useMemo, useState } from "react";
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
import { ApiClientError } from "@/lib/apiError";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { authLink } from "@/pages/Auth/authLink";
import { PATHS } from "@/routes/path";
import { resendVerificationEmail } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

const COOLDOWN_SECONDS = 60;

export function ResendVerificationPage() {
  const { t } = useTranslation("auth");
  const { t: tError } = useTranslation("errors");
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);
  const [remaining, setRemaining] = useState(0);

  // A single page's timer needs no store.
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const schema = useMemo(
    () => z.object({ email: z.email({ message: t("errors.email") }) }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => setRemaining(COOLDOWN_SECONDS),
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? translateServerErrors(error, tError)
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

  const cooling = remaining > 0;

  return (
    <AuthShell>
      <div className="mt-10">
        <h1 className="text-3xl">{t("resendVerification.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("resendVerification.subtitle")}
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

        {mutation.isSuccess && (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {t("resendVerification.sent")}
          </p>
        )}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full"
              disabled={isSubmitting || cooling}
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  {t("resendVerification.submitting")}
                </>
              ) : cooling ? (
                // The disabled state explains itself rather than going dead.
                t("resendVerification.cooldown", { seconds: remaining })
              ) : (
                t("resendVerification.submit")
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
