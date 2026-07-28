import type { QueryClient } from "@tanstack/react-query";
import type { RouterHistory } from "@tanstack/react-router";
import {
  Outlet,
  createRoute,
  createRouter,
  Link,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { requireAuth } from "@/guards/requireAuth";
import { requireGuest } from "@/guards/requireGuest";
import { queryClient } from "@/lib/queryClient";
import { AppPage } from "@/pages/App";
import { HomePage } from "@/pages/HomePage";
import { DesignSystemPage } from "@/pages/DesignSystem";
import { RegisterPage } from "@/pages/Register";
import { LoginPage } from "@/pages/Login";
import { LegalPage } from "@/pages/Legal";
import { VerifyEmailPage } from "@/pages/VerifyEmail";
import { ResendVerificationPage } from "@/pages/ResendVerification";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { ResetPasswordConfirmPage } from "@/pages/ResetPassword/Confirm";
import { authSearchSchema } from "@/schemas/redirect";
import { PATHS } from "@/routes/path";
import { rootRoute } from "@/routes/root";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.HOME,
  component: HomePage,
});

const designSystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.DESIGN_SYSTEM,
  component: DesignSystemPage,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.REGISTER,
  validateSearch: authSearchSchema,
  beforeLoad: requireGuest,
  component: RegisterPage,
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.LOGIN,
  validateSearch: authSearchSchema,
  beforeLoad: requireGuest,
  component: LoginPage,
});

/**
 * Verification and resend carry no guard, in either direction. Verification is
 * a prompt and never a gate, and the link arrives by email — it has to work
 * for a signed-out reader and must not interrupt a signed-in one.
 */
export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.VERIFY_EMAIL,
  component: VerifyEmailPage,
});

const resendVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.RESEND_VERIFICATION,
  component: ResendVerificationPage,
});

/** Also unguarded: a password reset must work for someone who cannot sign in. */
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.RESET_PASSWORD,
  component: ResetPasswordPage,
});

export const resetPasswordConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.RESET_PASSWORD_CONFIRM,
  component: ResetPasswordConfirmPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.TERMS,
  component: () => <LegalPage document="terms" />,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.PRIVACY,
  component: () => <LegalPage document="privacy" />,
});

/**
 * The authenticated surface. Protection is structural: one guarded layout
 * route, so every screen Phase 3 nests underneath inherits it and no page ever
 * repeats the check. Phase 3 replaces what these two render — the routes
 * themselves stay.
 */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.APP,
  beforeLoad: requireAuth,
  component: () => <Outlet />,
});

const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: AppPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  designSystemRoute,
  registerRoute,
  loginRoute,
  verifyEmailRoute,
  resendVerificationRoute,
  resetPasswordRoute,
  resetPasswordConfirmRoute,
  termsRoute,
  privacyRoute,
  appRoute.addChildren([appIndexRoute]),
]);

export function createAppRouter(options: {
  queryClient: QueryClient;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { queryClient: options.queryClient },
    history: options.history,
    defaultNotFoundComponent: NotFound,
  });
}

export const router = createAppRouter({ queryClient });

export type AppRouter = typeof router;

function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1>{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild variant="outline">
        <Link to={PATHS.HOME}>{t("notFound.backHome")}</Link>
      </Button>
    </main>
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
