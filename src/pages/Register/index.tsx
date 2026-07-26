import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Trans, useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/forms/FieldError";
import { PasswordField } from "@/forms/PasswordField";
import { TextField } from "@/forms/TextField";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { authLink } from "@/pages/Auth/authLink";
import { GoogleButton } from "@/pages/Auth/GoogleButton";
import { PATHS } from "@/routes/path";

export function RegisterPage() {
  const { t } = useTranslation("auth");

  // Built inside the component so validation messages follow the active
  // language and re-translate when the user switches.
  const registerSchema = useMemo(
    () =>
      z.object({
        email: z.email({ message: t("errors.email") }),
        password: z.string().min(8, { message: t("errors.passwordMin") }),
        acceptTerms: z
          .boolean()
          .refine((v) => v === true, { message: t("errors.acceptTerms") }),
      }),
    [t],
  );

  const form = useForm({
    defaultValues: { email: "", password: "", acceptTerms: false },
    validators: { onSubmit: registerSchema },
    onSubmit: async () => {
      // No auth backend yet — simulate the round-trip so loading/success
      // states are honest, and tell the user where things actually stand.
      await new Promise((resolve) => setTimeout(resolve, 1100));
      toast.success(t("success.registerTitle"), {
        description: t("success.registerDescription"),
      });
    },
  });

  return (
    <AuthShell>
      <div className="mt-10">
        <h1 className="text-3xl">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t("register.subtitle")}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <GoogleButton
          label={t("google.continue")}
          onClick={() =>
            toast.info(t("google.notConnectedTitle"), {
              description: t("google.signupNotConnected"),
            })
          }
        />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            {t("divider.registerEmail")}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

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
                errors={field.state.meta.errors}
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
                errors={field.state.meta.errors}
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
