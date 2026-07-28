import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/FormError";
import { PasswordField } from "@/forms/PasswordField";
import {
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { ApiClientError } from "@/lib/apiError";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { PATHS } from "@/routes/path";
import { resetPasswordConfirmRoute } from "@/routes/router";
import { confirmPasswordReset } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/**
 * Sets a new password from an emailed link.
 *
 * No guard, for the same reason as the request page: the user cannot sign in.
 */
export function ResetPasswordConfirmPage() {
  const { t } = useTranslation("auth");
  const { t: tError } = useTranslation("errors");
  const { uid, token } = resetPasswordConfirmRoute.useParams();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, { message: t("errors.passwordMin") }),
          passwordConfirm: z.string(),
        })
        .refine((v) => v.password === v.passwordConfirm, {
          message: t("errors.passwordMismatch"),
          path: ["passwordConfirm"],
        }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: confirmPasswordReset,
    onError: (error) => {
      if (!(error instanceof ApiClientError)) {
        setServerErrors({
          fieldErrors: {},
          formErrors: [tError("unexpected")],
        });
        return;
      }

      // `token` and `uid` came from the link, not from an input the user can
      // see. Their messages would vanish if they stayed keyed to a field, so
      // they are lifted into the banner — an expired link has to say so.
      const { fieldErrors, formErrors } = translateServerErrors(error, tError);
      const { token: tokenErrors, uid: uidErrors, ...visible } = fieldErrors;
      setServerErrors({
        fieldErrors: visible,
        // A deduplicating Set: the server answers an expired or reused link
        // with the identical message on both `token` and `uid`, and once
        // translated the pair would otherwise repeat the same sentence twice.
        formErrors: [
          ...new Set([
            ...formErrors,
            ...(tokenErrors ?? []),
            ...(uidErrors ?? []),
          ]),
        ],
      });
    },
  });

  const form = useForm({
    defaultValues: { password: "", passwordConfirm: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        await mutation.mutateAsync({
          uid,
          token,
          new_password1: value.password,
          new_password2: value.passwordConfirm,
        });
      } catch {
        // Already rendered by onError.
      }
    },
  });

  if (mutation.isSuccess) {
    return (
      <AuthShell>
        <div className="mt-10 space-y-4">
          <h1 className="text-3xl">{t("resetConfirm.successTitle")}</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("resetConfirm.successBody")}
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link to={PATHS.LOGIN}>{t("resetConfirm.goToLogin")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mt-10">
        <h1 className="text-3xl">{t("resetConfirm.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("resetConfirm.subtitle")}
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
                ...(serverErrors.fieldErrors.new_password1 ?? []),
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
                ...(serverErrors.fieldErrors.new_password2 ?? []),
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
                  {t("resetConfirm.submitting")}
                </>
              ) : (
                t("resetConfirm.submit")
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthShell>
  );
}
