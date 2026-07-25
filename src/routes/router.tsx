import { createRoute, createRouter, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { HomePage } from "@/pages/HomePage";
import { DesignSystemPage } from "@/pages/DesignSystem";
import { RegisterPage } from "@/pages/Register";
import { LoginPage } from "@/pages/Login";
import { LegalPage } from "@/pages/Legal";
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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.REGISTER,
  component: RegisterPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.LOGIN,
  component: LoginPage,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  designSystemRoute,
  registerRoute,
  loginRoute,
  termsRoute,
  privacyRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
});

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
