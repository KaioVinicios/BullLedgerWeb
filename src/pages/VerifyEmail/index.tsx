import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/pages/Auth/AuthShell";
import { PATHS } from "@/routes/path";
import { verifyEmailRoute } from "@/routes/router";
import { authKeys, verifyEmail } from "@/services/auth";

/**
 * Confirms the key from an emailed link.
 *
 * Verification is never a gate — this route carries no guard, and the rest of
 * the app stays usable whether or not a user ever lands here.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation("auth");
  const { key } = verifyEmailRoute.useParams();

  // The emailed link is itself the user's action; asking them to press a
  // second button would be ceremony, so the confirmation fires on arrival.
  //
  // A query rather than a mutation, even though this POSTs: the key is
  // single-use, so the request must happen exactly once per link, and the
  // query cache is what remembers both that it ran and how it went. An effect
  // guarded by a ref cannot — the ref survives StrictMode's remount while the
  // request state does not, which left the page confirming forever in dev.
  const confirmation = useQuery({
    queryKey: authKeys.emailVerification(key),
    queryFn: () => verifyEmail({ key }),
    // Every refetch trigger is off for the same reason: a retried key is a
    // spent key, and the second attempt answers 404.
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <AuthShell>
      <div className="mt-10 space-y-4">
        {confirmation.isSuccess ? (
          <>
            <h1 className="flex items-center gap-2.5 text-3xl">
              {/* Deliberately untinted: `--gain` and `--loss` mean money moved,
                  and this is not a figure. The mark plus the heading say it. */}
              <IconCircleCheck aria-hidden className="size-7" />
              {t("verifyEmail.successTitle")}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground">
              {t("verifyEmail.successBody")}
            </p>
            <Button asChild size="lg" className="mt-2">
              <Link to={PATHS.APP}>{t("verifyEmail.continueToApp")}</Link>
            </Button>
          </>
        ) : confirmation.isError ? (
          <>
            <h1 className="flex items-center gap-2.5 text-3xl">
              <IconAlertTriangle
                aria-hidden
                className="size-7 text-destructive"
              />
              {t("verifyEmail.errorTitle")}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground">
              {t("verifyEmail.errorBody")}
            </p>
            <Button asChild size="lg" variant="outline" className="mt-2">
              <Link to={PATHS.RESEND_VERIFICATION}>
                {t("verifyEmail.requestNew")}
              </Link>
            </Button>
          </>
        ) : (
          <p
            aria-live="polite"
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <IconLoader2 aria-hidden className="size-4 animate-spin" />
            {t("verifyEmail.verifying")}
          </p>
        )}
      </div>
    </AuthShell>
  );
}
