import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/forms/PasswordField";
import { TextField } from "@/forms/TextField";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { authLink } from "@/pages/Auth/authLink";
import { GoogleButton } from "@/pages/Auth/GoogleButton";
import { PATHS } from "@/routes/path";

export function LoginPage() {
  const { t } = useTranslation("auth");

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email({ message: t("errors.email") }),
        password: z.string().min(1, { message: t("errors.passwordRequired") }),
        rememberMe: z.boolean(),
      }),
    [t],
  );

  const form = useForm({
    defaultValues: { email: "", password: "", rememberMe: false },
    validators: { onSubmit: loginSchema },
    onSubmit: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      toast.info(t("success.loginTitle"), {
        description: t("success.loginDescription"),
      });
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
        <GoogleButton
          label={t("google.continue")}
          onClick={() =>
            toast.info(t("google.notConnectedTitle"), {
              description: t("google.signinNotConnected"),
            })
          }
        />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            {t("divider.loginEmail")}
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
                autoComplete="current-password"
                placeholder={t("fields.passwordPlaceholder")}
                errors={field.state.meta.errors}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

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
