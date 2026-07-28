import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { env } from "@/config/env";
import { GoogleButton } from "@/pages/Auth/GoogleButton";
import { PATHS } from "@/routes/path";
import { currentUserQuery, googleLogin } from "@/services/auth";

interface GoogleSignInProps {
  /** Failures surface as ordinary form errors, never as a crash or a toast. */
  onError: (message: string) => void;
}

/**
 * Google sign-in, or nothing at all.
 *
 * With no client id there is no working flow, so the button does not exist —
 * rather than sitting there disabled, inviting a click that could only fail.
 * Callers render this without checking configuration themselves.
 */
export function GoogleSignIn({ onError }: GoogleSignInProps) {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleSignInButton onError={onError} />
    </GoogleOAuthProvider>
  );
}

/** Separate component because `useGoogleLogin` must run inside the provider. */
function GoogleSignInButton({ onError }: GoogleSignInProps) {
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: async () => {
      // Unlike login, Google's response carries no user object — it is
      // { access_token?, code?, id_token? }. The cookies are set, so ask the
      // server who arrived rather than assuming.
      await queryClient.fetchQuery(currentUserQuery);
      await navigate({ to: PATHS.APP });
    },
    onError: () => onError(t("google.failed")),
  });

  const start = useGoogleLogin({
    // Authorization-code flow: the SPA never sees a client secret, and the
    // code means nothing until the backend exchanges it.
    flow: "auth-code",
    onSuccess: ({ code }) => mutation.mutate({ code }),
    // OAuth-level refusal, e.g. the user declining the consent screen.
    onError: () => onError(t("google.failed")),
    onNonOAuthError: ({ type }) => {
      // Closing the popup is a change of mind, not an error. Saying nothing is
      // the calm response; a red banner would not be.
      if (type === "popup_closed") return;
      onError(t("google.popupBlocked"));
    },
  });

  return <GoogleButton label={t("google.continue")} onClick={() => start()} />;
}
