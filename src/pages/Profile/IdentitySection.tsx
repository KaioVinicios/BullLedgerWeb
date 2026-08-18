import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";
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
import { TextField } from "@/forms/TextField";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { authKeys, updateCurrentUser, type CurrentUser } from "@/services/auth";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/**
 * Who the user is, as far as this application is concerned.
 *
 * `email` is `readonly` on the schema, so it is a label/value pair rather than
 * a disabled input: a greyed-out field reads as "not yet", when the truth is
 * "not from this screen". A `<dl>` is the honest markup for that pair and
 * needs no ARIA to say what a `<label>` would have said.
 *
 * Saving here touches nothing derived, so — unlike the reporting preferences
 * next to it — it invalidates no projection.
 */
export function IdentitySection({ user }: { user: CurrentUser }) {
  const { t } = useTranslation("app");
  // A second scoped `t`: the app-scoped one cannot reach another namespace.
  const { t: tError } = useTranslation("errors");
  const locale = useFormatLocale();
  const queryClient = useQueryClient();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);

  const mutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updated) => {
      // The PATCH answers with the stored user, so the cache is seeded from
      // the response rather than refetched.
      queryClient.setQueryData(authKeys.user(), updated);
      toast.success(t("profile.saved.identity"));
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? claimFieldErrors(translateServerErrors(error, tError, locale), [
              "first_name",
              "last_name",
            ])
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
    },
    onSubmit: async ({ value, formApi }) => {
      setServerErrors(NO_SERVER_ERRORS);
      try {
        const updated = await mutation.mutateAsync(value);
        // Reset to the *response*, not to what was submitted: if the server
        // normalized anything, the form must show what was stored.
        formApi.reset({
          first_name: updated.first_name ?? "",
          last_name: updated.last_name ?? "",
        });
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  return (
    // Named, because the screen carries two forms. Without a name a <form> is
    // not even a landmark, and "Save" alone does not say what it saves.
    <form
      noValidate
      aria-labelledby="identity-title"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle id="identity-title">
            {t("profile.identity.title")}
          </CardTitle>
          <CardDescription>{t("profile.identity.description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="space-y-1">
            <dt className="text-sm font-medium">
              {t("profile.identity.email")}
            </dt>
            <dd className="font-mono text-sm text-muted-foreground">
              {user.email}
            </dd>
          </dl>

          <form.Field name="first_name">
            {(field) => (
              <TextField
                name={field.name}
                label={t("profile.identity.firstName")}
                autoComplete="given-name"
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.first_name ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="last_name">
            {(field) => (
              <TextField
                name={field.name}
                label={t("profile.identity.lastName")}
                autoComplete="family-name"
                errors={[
                  ...field.state.meta.errors,
                  ...(serverErrors.fieldErrors.last_name ?? []),
                ]}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

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
