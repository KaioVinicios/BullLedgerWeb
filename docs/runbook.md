<!-- v1.0.0 | last changed 2026-07-25 -->

# Frontend Runbook

Everything needed to install, run, verify, and build the BullLedger web client.
Conventions live elsewhere and are not repeated here: `docs/structure.md` for where
files go, `docs/stack.md` for which libraries are approved, and `PRODUCT.md` for
brand, design principles, and the WCAG 2.1 AA bar.

## Prerequisites

- [bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`

## Install

```bash
bun install
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | yes | Base URL of the BullLedger API, no trailing slash |
| `VITE_GOOGLE_CLIENT_ID` | no | Google OAuth client id; sign-in is disabled while unset |

`src/config/env.ts` validates these and throws an error naming any variable that is
missing or malformed. Nothing else in the codebase may read `import.meta.env`.

The client talks to the real API origin in development — there is no dev proxy, so
cross-origin cookies, credentialed CORS, and CSRF behave exactly as they do in
production.

## Run

```bash
bun run dev       # dev server on http://localhost:5173
bun run build     # production build (typecheck + bundle)
bun run preview   # serve the production build locally
```

## Verify

```bash
bun run check     # lint + format:check + typecheck + test — run before pushing
```

Individually:

```bash
bun run lint          bun run lint:fix
bun run format        bun run format:check
bun run typecheck
bun run test          bun run test:watch
bun run test:e2e      # Playwright; boots the dev server itself
```

Unit and component tests run against MSW, never the network. `bun run test`
needs no `.env` beyond what `vite.config.ts` supplies under `test.env`.

CI runs `bun run check` and `bun run build` on every push. Playwright is deliberately
not in CI yet — it runs locally until there are real user flows to walk.

## Regenerate API types

Types come from the live OpenAPI schema and are committed, never hand-written.

```bash
bun run api:sync      # fetch the schema, then regenerate the types
```

That is `api:schema` (fetch `$VITE_API_URL/system/schema/` into `openapi.yaml`)
followed by `api:types` (generate `src/types/api.d.ts`). Both artifacts are committed
so that lint, typecheck, and test stay hermetic and work offline.

Never edit `src/types/api.d.ts` by hand. It is excluded from Prettier and ESLint, and
`openapi-typescript` is pinned to an exact version, so that a regeneration diff means
the schema actually changed.

Consume the types by schema name:

```ts
import type { components } from "@/types/api";

type Account = components["schemas"]["Account"];
```

The `schema-drift` CI job regenerates from the live schema and fails when the committed
output no longer matches. That failure means the API changed: run `bun run api:sync`,
fix whatever no longer type-checks, and commit the result. **The schema is authoritative
over every document in `docs/`.**

## Add an environment variable

1. Declare it in the schema in `src/config/env.ts`. Use `z.stringbool()` for a boolean
   flag, since values from the environment always arrive as strings.
2. Document it in `.env.example`.
3. Add it to your own `.env`.
4. If a production build needs it, add it to the `verify` job in
   `.github/workflows/ci.yml`.

## Layout notes

- `src/setupTests.ts` — Vitest setup: jest-dom matchers, the MSW server, real
  i18n resources, and React Testing Library's `cleanup`. The last two are not
  optional. Without i18n, `t()` echoes the key and a test asserting on
  translated copy can pass because the key contains the word it looked for;
  without an explicit `cleanup`, the DOM accumulates across tests in a file
  (RTL only auto-registers it under `globals: true`, which this project does
  not use).
- `src/mocks/` — MSW handlers and the `setupServer` instance. The server starts
  with `onUnhandledRequest: "error"`, so a request no handler covers fails the
  test instead of hitting the network. Default handlers are deliberately empty:
  each suite declares the traffic it cares about with `server.use(...)`.
- The transport layer is proven under MSW rather than against the live API —
  CSRF, 401 recovery, refresh deduplication, and envelope unwrapping all have
  integration tests in `src/lib/`.
- `src/lib/apiClient.ts` sets **both** `withCredentials` and `withXSRFToken`.
  The second is not redundant: since axios 1.6.2 the CSRF header is attached to
  cross-origin requests only when it is set, and every request this app makes
  is cross-origin. Drop it and the header disappears with no error.
- The 401 retry flag on the axios config is a string key, not a symbol.
  Replaying runs the config back through axios's `mergeConfig`, which
  enumerates with `Object.keys` — a symbol would be dropped there and every
  retry would look like a first attempt, refreshing in an endless loop.
- `scripts/fetch-schema.ts` — downloads the OpenAPI schema. It runs through Bun rather
  than as a shell one-liner because Bun loads `.env` for its runtime but not into the
  shell that executes `package.json` scripts.
- `e2e/` — Playwright specs. Excluded from Vitest so the two runners never collide.
