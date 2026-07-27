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
} as const;
