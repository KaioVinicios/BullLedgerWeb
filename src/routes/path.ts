// Single source of truth for route paths. `as const` keeps the literal
// types so TanStack Router can still type-check `<Link to>` and `path`
// against the route tree.
//
// No PUBLIC/PROTECTED prefixes here: protection and URL composition come
// from the route tree itself — a layout route (e.g. path "/app" with a
// beforeLoad auth guard) prefixes and protects all of its children.
// Params use TanStack segments (e.g. "/verify-email/$uid/$token") and are
// passed via the `params` prop, not string interpolation.

const APP = "/app";

/**
 * The authenticated surface, one entry per child route of `/app`.
 *
 * Two forms exist because the router and the links need different things.
 * TanStack composes a route's path as `join(parent.fullPath, child.path)`
 * (`router-core/route.js`), so a child declared as "/app/accounts" under a
 * parent at "/app" would resolve to "/app/app/accounts" — the tree needs the
 * bare segment. `<Link to>` needs the whole path. `PATHS` derives the second
 * from the first so the two can never drift, and `tests/path.test.ts` proves
 * both the derivation and that the literal types survive it.
 */
export const APP_SEGMENTS = {
  INSTITUTIONS: "institutions",
  ACCOUNTS: "accounts",
  ASSETS: "assets",
  LEDGER: "ledger",
  PRICING: "pricing",
  TARGETS: "targets",
  PROFILE: "profile",
  HELP: "help",
  FEEDBACK: "feedback",
} as const;

export const PATHS = {
  HOME: "/",
  DESIGN_SYSTEM: "/design-system",
  REGISTER: "/register",
  LOGIN: "/login",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  APP,
  INSTITUTIONS: `${APP}/${APP_SEGMENTS.INSTITUTIONS}`,
  ACCOUNTS: `${APP}/${APP_SEGMENTS.ACCOUNTS}`,
  ASSETS: `${APP}/${APP_SEGMENTS.ASSETS}`,
  LEDGER: `${APP}/${APP_SEGMENTS.LEDGER}`,
  PRICING: `${APP}/${APP_SEGMENTS.PRICING}`,
  TARGETS: `${APP}/${APP_SEGMENTS.TARGETS}`,
  PROFILE: `${APP}/${APP_SEGMENTS.PROFILE}`,
  HELP: `${APP}/${APP_SEGMENTS.HELP}`,
  FEEDBACK: `${APP}/${APP_SEGMENTS.FEEDBACK}`,
  VERIFY_EMAIL: "/verify-email/$key",
  RESEND_VERIFICATION: "/resend-verification",
  RESET_PASSWORD: "/reset-password",
  RESET_PASSWORD_CONFIRM: "/reset-password/$uid/$token",
} as const;
