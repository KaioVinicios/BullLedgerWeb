import { createRoute, createRouter, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { HomePage } from "@/pages/HomePage";
import { DesignSystemPage } from "@/pages/DesignSystem";
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

const routeTree = rootRoute.addChildren([indexRoute, designSystemRoute]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
});

function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1>404</h1>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Button asChild variant="outline">
        <Link to={PATHS.HOME}>Back home</Link>
      </Button>
    </main>
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
