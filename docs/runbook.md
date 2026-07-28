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

## Authentication

Sessions are httpOnly JWT cookies, so the client never sees a token. Auth status
comes from `GET /api/auth/user/` — cached under the `["auth","user"]` query key and
read through `useCurrentUser()`. Protection is structural: `/app` and everything
under it sit behind one guarded layout route, so no page repeats the check.

`POST /api/auth/login/` currently returns HTTP 500 on the deployed API
(`no such table: account_emailaddress`), so no live session can be established.
Every auth behaviour is covered by MSW tests instead; the live walk is an open
item, not a client defect.

Google sign-in stays hidden until `VITE_GOOGLE_CLIENT_ID` is set — the button and
its divider both, rather than a disabled control that could only fail.

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
bun run test:e2e      # Playwright; see End-to-end tests below
```

Unit and component tests run against MSW, never the network. `bun run test`
needs no `.env` beyond what `vite.config.ts` supplies under `test.env`.

CI runs `bun run check` and `bun run build` on every push. Playwright is deliberately
not in CI yet — it needs a live API service in the pipeline, so it runs locally
until that exists.

## End-to-end tests

Playwright specs live in `e2e/`, one file per user journey. They run against a
**real API and a real database** — a mocked E2E proves nothing this suite
exists to prove, so unlike the component tests there is no MSW here.

Playwright starts the dev server itself — do not start one for it. The API is a
manual prerequisite, and **how** it is started matters: the specs read the
emailed verification and reset keys out of its console output, so that output
has to reach `.e2e-mailbox/api.log`.

In one terminal, leave the API running:

```bash
mkdir -p .e2e-mailbox                   # from the web repo, once
cd ../BullLedgerAPI
PYTHONUNBUFFERED=1 uv run python manage.py runserver 8000 --noreload \
  2>&1 | tee ../BullLedgerWeb/.e2e-mailbox/api.log
```

`tee` rather than `>` so the log stays readable in the terminal too — a failing
spec is usually explained by the traceback scrolling past there.

In another, from the web repo:

```bash
bun run test:e2e
```

An API started any other way runs the app fine but leaves no mailbox, and the
four specs that follow an emailed link fail with `No API mailbox at …`.

| Requirement | Why |
|---|---|
| Migrations applied | The specs write. `uv run python manage.py migrate` |
| `EMAIL_BACKEND` left at the console default | The mailbox *is* the API's stdout |
| API `FRONTEND_URL=http://localhost:5173` | Emailed links must land on the SPA, and the specs assert they do |
| `VITE_API_URL=http://localhost:8000` | Or export `E2E_API_URL` to match whatever the dev server booted with |

Things worth knowing before changing any of it:

- **The mailbox path is not under `test-results/`.** Playwright empties its
  output directory at the start of every run, and the API — still holding the
  file it was started with — would go on writing to a deleted inode. Every
  emailed key would read as an email that never arrived. Override the location
  with `E2E_API_LOG` if you need to.
- **Quoted-printable soft wraps are re-joined before anything reads a link.**
  The backend breaks long lines with a trailing `=`, which lands in the middle
  of every URL it sends; a key copied without re-joining fails its HMAC
  signature and 404s, which looks exactly like an expired link. This has
  already cost two false bug reports. `e2e/support/mailbox.ts` handles it.
- **The suite runs one worker at a time.** Not because the specs share state —
  each brings a user nobody else uses — but because the development database is
  SQLite, which takes a single writer: concurrent registrations answer
  `database is locked` with a 500. `PRAGMA journal_mode=WAL` plus a busy
  timeout on the API, or the Postgres its CI already uses, brings parallelism
  back and the `workers: 1` line in `playwright.config.ts` comes out.
- **Google sign-in is stubbed at the SDK boundary** and says so in the spec:
  Google's consent screen needs a human, so `e2e/support/google.ts` replaces
  the GSI script. The client half runs for real; the code exchange and the
  provisioning stay covered by the API's own tests.
- Specs pin the interface language before the app boots (`e2e/support/
  fixtures.ts`) and assert against the shipped locale JSON rather than
  hand-typed sentences, so a copy change breaks the spec that asserts it and
  nothing else.

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
  test instead of hitting the network. Default handlers are deliberately near-empty:
  each suite declares the traffic it cares about with `server.use(...)`. The one
  shared handler is `GET /api/auth/csrf/`, which is infrastructure rather than
  domain traffic — the client acquires a token before every unsafe request.
- The transport layer is proven under MSW rather than against the live API —
  CSRF, 401 recovery, refresh deduplication, and envelope unwrapping all have
  integration tests in `src/lib/`.
- `src/lib/apiClient.ts` sets **both** `withCredentials` and `withXSRFToken`.
  The second is not redundant: since axios 1.6.2 the CSRF header is attached to
  cross-origin requests only when it is set, and every request this app makes
  is cross-origin. Drop it and the header disappears with no error.
- **CSRF acquisition is a startup step.** The API refuses any cookie-authenticated
  unsafe request without an `X-CSRFToken` header, and it hands the token out from
  `GET /api/auth/csrf/` and nowhere else. `main.tsx` calls `ensureCsrfToken()` at
  boot without awaiting it, and `src/lib/csrf.ts` makes every unsafe request await
  the same acquisition — so a write can never overtake it, and concurrent callers
  share one request. Safe methods switch `withXSRFToken` off, keeping the token
  out of reads entirely. The refresh call is covered too: it is itself a
  cookie-authenticated `POST`.
- The 401 retry flag on the axios config is a string key, not a symbol.
  Replaying runs the config back through axios's `mergeConfig`, which
  enumerates with `Object.keys` — a symbol would be dropped there and every
  retry would look like a first attempt, refreshing in an endless loop.
- `scripts/fetch-schema.ts` — downloads the OpenAPI schema. It runs through Bun rather
  than as a shell one-liner because Bun loads `.env` for its runtime but not into the
  shell that executes `package.json` scripts.
- `e2e/` — Playwright specs. Excluded from Vitest so the two runners never collide.
