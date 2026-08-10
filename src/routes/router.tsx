import type { QueryClient } from "@tanstack/react-query";
import type { RouterHistory } from "@tanstack/react-router";
import {
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  stripSearchParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageSkeleton } from "@/components/PageSkeleton";
import { AppError } from "@/components/shell/AppError";
import { AppNotFound } from "@/components/shell/AppNotFound";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/guards/requireAuth";
import { requireGuest } from "@/guards/requireGuest";
import { queryClient } from "@/lib/queryClient";
import { HomePage } from "@/pages/HomePage";
import { RegisterPage } from "@/pages/Register";
import { LoginPage } from "@/pages/Login";
import { LegalPage } from "@/pages/Legal";
import { VerifyEmailPage } from "@/pages/VerifyEmail";
import { ResendVerificationPage } from "@/pages/ResendVerification";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { ResetPasswordConfirmPage } from "@/pages/ResetPassword/Confirm";
import {
  ledgerListDefaults,
  ledgerListSearchSchema,
  lotsSearchSchema,
} from "@/schemas/ledgerList";
import {
  fxListDefaults,
  fxListSearchSchema,
  newQuoteSearchSchema,
  pricingListDefaults,
  pricingListSearchSchema,
} from "@/schemas/pricingList";
import {
  allocationDefaults,
  allocationSearchSchema,
  holdingsDefaults,
  holdingsSearchSchema,
  limitsDefaults,
  limitsSearchSchema,
  overviewSearchSchema,
  salesDefaults,
  salesSearchSchema,
} from "@/schemas/portfolioView";
import { authSearchSchema } from "@/schemas/redirect";
import {
  assetListSearchSchema,
  resourceListDefaults,
  resourceListSearchSchema,
} from "@/schemas/resourceList";
import {
  newTargetSearchSchema,
  targetsListDefaults,
  targetsListSearchSchema,
} from "@/schemas/targetsList";
import { APP_CHILD_SEGMENTS, APP_SEGMENTS, PATHS } from "@/routes/path";
import { rootRoute } from "@/routes/root";
import { accountQuery } from "@/services/accounts";
import { assetKeys, assetQuery, listAssets } from "@/services/assets";
import { institutionQuery } from "@/services/institutions";
import { movementQuery } from "@/services/movements";
import { movementTypesQuery } from "@/services/movementTypes";
import { holdingQuery } from "@/services/portfolio";
import { profileQuery } from "@/services/profile";
import { targetQuery } from "@/services/targets";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.HOME,
  component: HomePage,
});

const designSystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.DESIGN_SYSTEM,
  component: lazyRouteComponent(
    () => import("@/pages/DesignSystem"),
    "DesignSystemPage",
  ),
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
 * route, so every screen nested underneath inherits it and no page ever
 * repeats the check.
 */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PATHS.APP,
  beforeLoad: requireAuth,
  component: AppShell,
  // Not-found belongs here: an unmatched child still matches this route, so
  // this renders into the Outlet with the sidebar and header around it. The
  // root route keeps its own shell-less not-found for public 404s.
  notFoundComponent: AppNotFound,
  // Errors are the opposite case, and the reason `appScreenOptions` below
  // carries its own. A route's errorComponent *replaces that route's match*,
  // so an AppError here would take the shell down with the screen that threw.
  // This copy is the last resort for a failure in the shell itself, where
  // rendering shell-less is the only option left.
  errorComponent: AppError,
});

/**
 * What every screen under the shell shares: its own chunk's skeleton while
 * that chunk loads, and an error surface that renders *inside* the shell
 * because the boundary sits on the screen rather than on the layout.
 */
const appScreenOptions = {
  pendingComponent: PageSkeleton,
  errorComponent: AppError,
} as const;

/** Only live assets can take a quote; an archived one takes no new anything. */
const LIVE_ASSETS = {} as const;

const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  // No `stripSearchParams`: absence *is* the default here — an overview with
  // nothing collapsed writes nothing to the address bar, so there is nothing
  // to strip back out.
  validateSearch: overviewSearchSchema,
  component: lazyRouteComponent(
    () => import("@/pages/Overview"),
    "OverviewPage",
  ),
  ...appScreenOptions,
});

/**
 * One route per resource, each in its own chunk. `lazyRouteComponent` keeps
 * the manual tree and the one-folder-per-screen layout intact — no `.lazy.tsx`
 * files — and TanStack shows `pendingComponent` while the chunk downloads,
 * which is what makes the skeleton real before any of these screens fetches
 * anything.
 */
/**
 * The list screens validate their URL state — page, archived visibility,
 * ordering, and on assets the archetype filter — with `.catch` fallbacks, so
 * a stale or hand-edited link renders defaults instead of a route error.
 * `stripSearchParams` keeps those defaults out of the address bar: a URL only
 * says what differs from the resting state. Spelled per route rather than
 * shared, because each route's generics must infer their own middleware
 * array.
 */
const institutionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.INSTITUTIONS,
  validateSearch: resourceListSearchSchema,
  search: { middlewares: [stripSearchParams(resourceListDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Institutions"),
    "InstitutionsPage",
  ),
  ...appScreenOptions,
});

const institutionNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.INSTITUTIONS_NEW,
  component: lazyRouteComponent(
    () => import("@/pages/Institutions/New"),
    "InstitutionNewPage",
  ),
  ...appScreenOptions,
});

const institutionEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.INSTITUTIONS_EDIT,
  // Resolved before the screen renders, so the form mounts with real server
  // values as its defaults — the same reason the profile route loads.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(institutionQuery(params.id)),
  component: lazyRouteComponent(
    () => import("@/pages/Institutions/Edit"),
    "InstitutionEditPage",
  ),
  ...appScreenOptions,
});

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.ACCOUNTS,
  validateSearch: resourceListSearchSchema,
  search: { middlewares: [stripSearchParams(resourceListDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Accounts"),
    "AccountsPage",
  ),
  ...appScreenOptions,
});

const accountNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.ACCOUNTS_NEW,
  component: lazyRouteComponent(
    () => import("@/pages/Accounts/New"),
    "AccountNewPage",
  ),
  ...appScreenOptions,
});

const accountEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.ACCOUNTS_EDIT,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(accountQuery(params.id)),
  component: lazyRouteComponent(
    () => import("@/pages/Accounts/Edit"),
    "AccountEditPage",
  ),
  ...appScreenOptions,
});

const assetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.ASSETS,
  validateSearch: assetListSearchSchema,
  search: { middlewares: [stripSearchParams(resourceListDefaults)] },
  component: lazyRouteComponent(() => import("@/pages/Assets"), "AssetsPage"),
  ...appScreenOptions,
});

const assetNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.ASSETS_NEW,
  component: lazyRouteComponent(
    () => import("@/pages/Assets/New"),
    "AssetNewPage",
  ),
  ...appScreenOptions,
});

const assetEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.ASSETS_EDIT,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(assetQuery(params.id)),
  component: lazyRouteComponent(
    () => import("@/pages/Assets/Edit"),
    "AssetEditPage",
  ),
  ...appScreenOptions,
});

const ledgerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.LEDGER,
  validateSearch: ledgerListSearchSchema,
  search: { middlewares: [stripSearchParams(ledgerListDefaults)] },
  component: lazyRouteComponent(() => import("@/pages/Ledger"), "LedgerPage"),
  ...appScreenOptions,
});

/**
 * Both write routes resolve the server's movement-type table before rendering,
 * for the same reason the structure edit routes resolve their record: a form
 * that mounts without the rules it filters by would offer every type for one
 * frame and then take them away.
 */
const ledgerNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.LEDGER_NEW,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(movementTypesQuery),
  component: lazyRouteComponent(
    () => import("@/pages/Ledger/New"),
    "MovementNewPage",
  ),
  ...appScreenOptions,
});

const ledgerTransferRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.LEDGER_TRANSFER,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(movementTypesQuery),
  component: lazyRouteComponent(
    () => import("@/pages/Ledger/Transfer"),
    "MovementTransferPage",
  ),
  ...appScreenOptions,
});

const ledgerCorrectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.LEDGER_CORRECT,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(movementQuery(params.id)),
      context.queryClient.ensureQueryData(movementTypesQuery),
    ]),
  component: lazyRouteComponent(
    () => import("@/pages/Ledger/Correct"),
    "MovementCorrectPage",
  ),
  ...appScreenOptions,
});

const ledgerLotsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.LEDGER_LOTS,
  validateSearch: lotsSearchSchema,
  component: lazyRouteComponent(
    () => import("@/pages/Ledger/Lots"),
    "LedgerLotsPage",
  ),
  ...appScreenOptions,
});

const pricingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.PRICING,
  validateSearch: pricingListSearchSchema,
  search: { middlewares: [stripSearchParams(pricingListDefaults)] },
  component: lazyRouteComponent(() => import("@/pages/Pricing"), "PricingPage"),
  ...appScreenOptions,
});

/**
 * Resolves the asset list before rendering, for the reason the ledger's write
 * routes resolve the movement-type table: the picker is filtered by
 * `pricing_mode`, and one that mounts empty would offer nothing for a frame
 * and then decide what the `?asset=` prefill was allowed to select.
 */
const pricingNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.PRICING_NEW,
  validateSearch: newQuoteSearchSchema,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: assetKeys.list(LIVE_ASSETS),
      queryFn: () => listAssets(LIVE_ASSETS),
    }),
  component: lazyRouteComponent(
    () => import("@/pages/Pricing/New"),
    "PriceQuoteNewPage",
  ),
  ...appScreenOptions,
});

const pricingFxRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.PRICING_FX,
  validateSearch: fxListSearchSchema,
  search: { middlewares: [stripSearchParams(fxListDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Pricing/Fx"),
    "PricingFxPage",
  ),
  ...appScreenOptions,
});

/**
 * Ranks above the sibling `accounts/$id/edit`: TanStack prefers a literal
 * segment over a param, exactly as `accounts/new` already relies on.
 */
const accountsLimitsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.ACCOUNTS_LIMITS,
  validateSearch: limitsSearchSchema,
  search: { middlewares: [stripSearchParams(limitsDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Accounts/Limits"),
    "ContributionLimitsPage",
  ),
  ...appScreenOptions,
});

const allocationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.ALLOCATION,
  validateSearch: allocationSearchSchema,
  search: { middlewares: [stripSearchParams(allocationDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Allocation"),
    "AllocationPage",
  ),
  ...appScreenOptions,
});

const holdingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.HOLDINGS,
  validateSearch: holdingsSearchSchema,
  search: { middlewares: [stripSearchParams(holdingsDefaults)] },
  component: lazyRouteComponent(
    () => import("@/pages/Holdings"),
    "HoldingsPage",
  ),
  ...appScreenOptions,
});

const salesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.SALES,
  validateSearch: salesSearchSchema,
  search: { middlewares: [stripSearchParams(salesDefaults)] },
  component: lazyRouteComponent(() => import("@/pages/Sales"), "SalesPage"),
  ...appScreenOptions,
});

/**
 * Resolved before the screen renders, for the reason every edit route resolves
 * its record: a projection screen that mounts empty and fills in is a screen
 * whose figures visibly change after the reader started reading them. A 404 —
 * no such holding in this portfolio — surfaces through `errorComponent`.
 */
const holdingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.HOLDING_DETAIL,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      holdingQuery(params.accountId, params.assetId),
    ),
  component: lazyRouteComponent(() => import("@/pages/Holding"), "HoldingPage"),
  ...appScreenOptions,
});

const targetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.TARGETS,
  validateSearch: targetsListSearchSchema,
  search: { middlewares: [stripSearchParams(targetsListDefaults)] },
  component: lazyRouteComponent(() => import("@/pages/Targets"), "TargetsPage"),
  ...appScreenOptions,
});

/**
 * Ranks above the sibling `targets/$id/edit`: TanStack prefers a literal
 * segment over a param, exactly as `accounts/new` already relies on.
 *
 * The search schema carries the prefill the holding detail writes. It is
 * validated rather than trusted for the reason every other search schema is: a
 * hand-edited link should open a blank form, not a route error.
 */
const targetNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.TARGETS_NEW,
  validateSearch: newTargetSearchSchema,
  component: lazyRouteComponent(
    () => import("@/pages/Targets/New"),
    "TargetNewPage",
  ),
  ...appScreenOptions,
});

const targetEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_CHILD_SEGMENTS.TARGETS_EDIT,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(targetQuery(params.id)),
  component: lazyRouteComponent(
    () => import("@/pages/Targets/Edit"),
    "TargetEditPage",
  ),
  ...appScreenOptions,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.PROFILE,
  // Resolved before the screen renders, so both forms mount with real server
  // values as their defaults. A form that mounts empty and resets when data
  // lands is where dirty-state bugs live — and `pendingComponent` already
  // covers the wait, so this costs no second loading surface.
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: lazyRouteComponent(() => import("@/pages/Profile"), "ProfilePage"),
  ...appScreenOptions,
});

const helpRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.HELP,
  component: lazyRouteComponent(() => import("@/pages/Help"), "HelpPage"),
  ...appScreenOptions,
});

const feedbackRoute = createRoute({
  getParentRoute: () => appRoute,
  path: APP_SEGMENTS.FEEDBACK,
  component: lazyRouteComponent(
    () => import("@/pages/Feedback"),
    "FeedbackPage",
  ),
  ...appScreenOptions,
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
  appRoute.addChildren([
    appIndexRoute,
    institutionsRoute,
    institutionNewRoute,
    institutionEditRoute,
    accountsRoute,
    accountNewRoute,
    accountEditRoute,
    accountsLimitsRoute,
    assetsRoute,
    assetNewRoute,
    assetEditRoute,
    ledgerRoute,
    ledgerNewRoute,
    ledgerTransferRoute,
    ledgerCorrectRoute,
    ledgerLotsRoute,
    pricingRoute,
    pricingNewRoute,
    pricingFxRoute,
    allocationRoute,
    holdingsRoute,
    salesRoute,
    holdingRoute,
    targetsRoute,
    targetNewRoute,
    targetEditRoute,
    profileRoute,
    helpRoute,
    feedbackRoute,
  ]),
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
    // Long enough that a fast chunk never flashes a skeleton, and once one is
    // shown it stays long enough to read as loading rather than as a glitch.
    defaultPendingMs: 300,
    defaultPendingMinMs: 400,
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
