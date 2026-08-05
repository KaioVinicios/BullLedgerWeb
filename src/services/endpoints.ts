/**
 * Every API path the client knows, in one place.
 *
 * Axios takes paths as plain strings, so nothing stops a typo from compiling.
 * Centralizing them is what replaces that missing check: a wrong path is a
 * one-line fix here rather than a hunt through services, and the same rule
 * that governs routes in `src/routes/path.ts` governs endpoints here — no
 * URL is ever written inline at a call site.
 *
 * Paths are added when a service needs one, not in advance. The authority on
 * what exists is the committed OpenAPI schema; see `docs/runbook.md`.
 */
export const ENDPOINTS = {
  accounts: "/api/accounts/",
  account: (id: string) => `/api/accounts/${id}/`,
  accountArchive: (id: string) => `/api/accounts/${id}/archive/`,
  accountUnarchive: (id: string) => `/api/accounts/${id}/unarchive/`,
  institutions: "/api/institutions/",
  institution: (id: string) => `/api/institutions/${id}/`,
  institutionArchive: (id: string) => `/api/institutions/${id}/archive/`,
  institutionUnarchive: (id: string) => `/api/institutions/${id}/unarchive/`,
  assets: "/api/assets/",
  asset: (id: string) => `/api/assets/${id}/`,
  assetArchive: (id: string) => `/api/assets/${id}/archive/`,
  assetUnarchive: (id: string) => `/api/assets/${id}/unarchive/`,

  // The ledger. Note what is absent: there is no PUT, PATCH, or DELETE on a
  // movement. `/api/movements/{id}/` is GET-only, because a movement is an
  // immutable fact — correcting one is `replace` (which voids the original and
  // records a successor) and removing one is `void`. Transfers have their own
  // path because they are two legs written atomically; the collection endpoint
  // rejects TRANSFER_IN/TRANSFER_OUT outright.
  movements: "/api/movements/",
  movement: (id: string) => `/api/movements/${id}/`,
  movementVoid: (id: string) => `/api/movements/${id}/void/`,
  movementReplace: (id: string) => `/api/movements/${id}/replace/`,
  movementTransfer: "/api/movements/transfer/",
  movementTypes: "/api/movement-types/",
  lots: "/api/lots/",
  holding: (accountId: string, assetId: string) =>
    `/api/portfolio/holdings/${accountId}/${assetId}/`,

  // Pricing. Both tables are insert-only and unique per (asset, date) /
  // (base, quote, date): there is no PATCH and no DELETE to name. FX has no
  // create path here at all — `POST /api/fx-rates/` is staff-only (403,
  // confirmed live), and the schema exposes no `is_staff` for the client to
  // check against first.
  priceQuotes: "/api/price-quotes/",
  fxRates: "/api/fx-rates/",

  // The read-only projections. Never posted to — every figure behind them is
  // recomputed from the movement log at read time.
  portfolioOverview: "/api/portfolio/overview/",
  portfolioAllocation: "/api/portfolio/allocation/",

  // Reference data: read-only for clients, and changed by a yearly data load
  // rather than by anything a user does here.
  contributionLimits: "/api/contribution-limits/",

  // Targets. Archival is the dedicated POST pair, never a DELETE — there is no
  // delete on a target, and `/api/targets/{id}/` takes GET and PATCH only. The
  // PATCH body carries no scope, which is the schema saying a target for a
  // different scope is a different target.
  targets: "/api/targets/",
  target: (id: string) => `/api/targets/${id}/`,
  targetArchive: (id: string) => `/api/targets/${id}/archive/`,
  targetUnarchive: (id: string) => `/api/targets/${id}/unarchive/`,

  profile: "/api/profile/",

  // Auth. Two paths are deliberately absent for the same reason — `lib/` must
  // not import from `services/` without inverting the layering, and both are
  // transport concerns no feature ever calls: `POST /api/auth/token/refresh/`
  // is REFRESH_PATH in `src/lib/sessionRecovery.ts`, and
  // `GET /api/auth/csrf/` is CSRF_PATH in `src/lib/csrf.ts`.
  authUser: "/api/auth/user/",
  authLogin: "/api/auth/login/",
  authLogout: "/api/auth/logout/",
  authRegistration: "/api/auth/registration/",
  authGoogle: "/api/auth/google/",
  authVerifyEmail: "/api/auth/registration/verify-email/",
  authResendEmail: "/api/auth/registration/resend-email/",
  authPasswordReset: "/api/auth/password/reset/",
  authPasswordResetConfirm: "/api/auth/password/reset/confirm/",
} as const;
