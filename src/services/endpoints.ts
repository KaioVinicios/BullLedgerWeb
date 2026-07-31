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
