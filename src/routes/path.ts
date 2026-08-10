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
 * The overview's route **id**, which is not `PATHS.APP`.
 *
 * TanStack gives a layout route and its index child different ids: the guarded
 * layout is `/app` and the index beneath it is `/app/`. `getRouteApi` resolves
 * by id, so the overview — the one screen that *is* an index route — must ask
 * for this one. Passing `PATHS.APP` silently resolves the layout instead, whose
 * search schema is empty, and the screen reads `{}` forever.
 *
 * Deliberately not in `PATHS`: it is not a destination to link to. `<Link to>`
 * still uses `PATHS.APP`.
 */
export const APP_INDEX_ROUTE_ID = `${APP}/` as const;

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
  ALLOCATION: "allocation",
  HOLDINGS: "holdings",
  SALES: "sales",
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

/**
 * Child segments of the structure resources: create and edit screens, again
 * as the bare segments the route tree needs. Derived from `APP_SEGMENTS` so
 * a renamed resource cannot leave its children behind, and edit routes use a
 * TanStack `$id` param, never interpolation.
 */
export const APP_CHILD_SEGMENTS = {
  INSTITUTIONS_NEW: `${APP_SEGMENTS.INSTITUTIONS}/new`,
  INSTITUTIONS_EDIT: `${APP_SEGMENTS.INSTITUTIONS}/$id/edit`,
  ACCOUNTS_NEW: `${APP_SEGMENTS.ACCOUNTS}/new`,
  ACCOUNTS_EDIT: `${APP_SEGMENTS.ACCOUNTS}/$id/edit`,
  // Read-only reference data, sitting beside the resource whose `registration`
  // it qualifies rather than in primary navigation. A literal segment, which
  // TanStack ranks above the sibling `$id`, exactly as `accounts/new` does.
  ACCOUNTS_LIMITS: `${APP_SEGMENTS.ACCOUNTS}/limits`,
  ASSETS_NEW: `${APP_SEGMENTS.ASSETS}/new`,
  ASSETS_EDIT: `${APP_SEGMENTS.ASSETS}/$id/edit`,
  // The ledger's children are not a create/edit trio: a movement is immutable,
  // so `correct` replaces `edit`, and `transfer` exists because the API keeps
  // two-legged transfers on their own endpoint.
  LEDGER_NEW: `${APP_SEGMENTS.LEDGER}/new`,
  LEDGER_TRANSFER: `${APP_SEGMENTS.LEDGER}/transfer`,
  LEDGER_CORRECT: `${APP_SEGMENTS.LEDGER}/$id/correct`,
  LEDGER_LOTS: `${APP_SEGMENTS.LEDGER}/lots`,
  // Pricing's children are a create route and a sibling table, not a
  // create/edit trio: a quote and a rate are both immutable rows, and the FX
  // table has no client write at all — `POST /api/fx-rates/` is staff-only.
  PRICING_NEW: `${APP_SEGMENTS.PRICING}/new`,
  PRICING_FX: `${APP_SEGMENTS.PRICING}/fx`,
  // A target's create/edit pair, and no `archive` route: archival is an action
  // on a row, not a destination. There is also no detail route — the edit
  // screen *is* the detail view, as it is for every structure resource.
  TARGETS_NEW: `${APP_SEGMENTS.TARGETS}/new`,
  TARGETS_EDIT: `${APP_SEGMENTS.TARGETS}/$id/edit`,
  // Derived like every other child segment, which it could not be until the
  // holdings index existed. The old comment here recorded the opposite —
  // that `holdings` was a path prefix rather than a destination, because the
  // API publishes no holdings-list endpoint. That was true of the API and
  // never of the client: the index regroups `GET /api/portfolio/overview/`,
  // which arrives unpaginated with every row. So the index came first and the
  // detail now hangs off it, the way an edit route hangs off its resource.
  HOLDING_DETAIL: `${APP_SEGMENTS.HOLDINGS}/$accountId/$assetId`,
} as const;

export const PATHS = {
  HOME: "/",
  DESIGN_SYSTEM: "/design-system",
  REGISTER: "/register",
  LOGIN: "/login",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  APP,
  // Reached from the overview's breakdown block, not from the sidebar: a user
  // asking "how is this split?" is already looking at the split.
  ALLOCATION: `${APP}/${APP_SEGMENTS.ALLOCATION}`,
  HOLDINGS: `${APP}/${APP_SEGMENTS.HOLDINGS}`,
  HOLDING_DETAIL: `${APP}/${APP_CHILD_SEGMENTS.HOLDING_DETAIL}`,
  SALES: `${APP}/${APP_SEGMENTS.SALES}`,
  INSTITUTIONS: `${APP}/${APP_SEGMENTS.INSTITUTIONS}`,
  INSTITUTIONS_NEW: `${APP}/${APP_CHILD_SEGMENTS.INSTITUTIONS_NEW}`,
  INSTITUTIONS_EDIT: `${APP}/${APP_CHILD_SEGMENTS.INSTITUTIONS_EDIT}`,
  ACCOUNTS: `${APP}/${APP_SEGMENTS.ACCOUNTS}`,
  ACCOUNTS_NEW: `${APP}/${APP_CHILD_SEGMENTS.ACCOUNTS_NEW}`,
  ACCOUNTS_EDIT: `${APP}/${APP_CHILD_SEGMENTS.ACCOUNTS_EDIT}`,
  ACCOUNTS_LIMITS: `${APP}/${APP_CHILD_SEGMENTS.ACCOUNTS_LIMITS}`,
  ASSETS: `${APP}/${APP_SEGMENTS.ASSETS}`,
  ASSETS_NEW: `${APP}/${APP_CHILD_SEGMENTS.ASSETS_NEW}`,
  ASSETS_EDIT: `${APP}/${APP_CHILD_SEGMENTS.ASSETS_EDIT}`,
  LEDGER: `${APP}/${APP_SEGMENTS.LEDGER}`,
  LEDGER_NEW: `${APP}/${APP_CHILD_SEGMENTS.LEDGER_NEW}`,
  LEDGER_TRANSFER: `${APP}/${APP_CHILD_SEGMENTS.LEDGER_TRANSFER}`,
  LEDGER_CORRECT: `${APP}/${APP_CHILD_SEGMENTS.LEDGER_CORRECT}`,
  LEDGER_LOTS: `${APP}/${APP_CHILD_SEGMENTS.LEDGER_LOTS}`,
  PRICING: `${APP}/${APP_SEGMENTS.PRICING}`,
  PRICING_NEW: `${APP}/${APP_CHILD_SEGMENTS.PRICING_NEW}`,
  PRICING_FX: `${APP}/${APP_CHILD_SEGMENTS.PRICING_FX}`,
  TARGETS: `${APP}/${APP_SEGMENTS.TARGETS}`,
  TARGETS_NEW: `${APP}/${APP_CHILD_SEGMENTS.TARGETS_NEW}`,
  TARGETS_EDIT: `${APP}/${APP_CHILD_SEGMENTS.TARGETS_EDIT}`,
  PROFILE: `${APP}/${APP_SEGMENTS.PROFILE}`,
  HELP: `${APP}/${APP_SEGMENTS.HELP}`,
  FEEDBACK: `${APP}/${APP_SEGMENTS.FEEDBACK}`,
  VERIFY_EMAIL: "/verify-email/$key",
  RESEND_VERIFICATION: "/resend-verification",
  RESET_PASSWORD: "/reset-password",
  RESET_PASSWORD_CONFIRM: "/reset-password/$uid/$token",
} as const;
