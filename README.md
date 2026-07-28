# BullLedgerWeb

Web frontend for **BullLedger**, an investment-tracking app for individual investors:
record holdings, transactions, and movements, and read back positions and performance.
It is a client for the BullLedger REST API and holds no database of its own — every
figure on screen came from the server, and the ledger is never recomputed here.

Built with React, TypeScript, and the TanStack ecosystem. A native Swift client is
planned against the same API.

## Status

Early, and building in phases. Shipped so far:

| Phase                    | What it covers                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 0 — Client foundations   | Vite, Tailwind + shadcn/ui, routing, theming, i18n (en/pt), design-system showcase                             |
| 1 — Transport & contract | axios client, CSRF, 401 refresh-and-replay, error normalization, generated API types, money/decimal primitives |
| 2 — Session & identity   | Register, log in, log out, Google sign-in, email verification, password reset, route guards, session recovery  |

Next up is **Phase 3, the application shell** — nav, header, and account menu. Until it
lands, `/app` is a placeholder that proves the session works. The phase plans
(`docs/v1-todo.md`, `docs/v1-e2e-todo.md`) are local working documents and are not
committed.

## Stack

React · TypeScript · Vite · Tailwind · shadcn/ui · TanStack Query / Router / Form ·
Zustand · Zod · axios · big.js · react-i18next · Vitest · Testing Library · MSW ·
Playwright · bun

`docs/stack.md` explains why each one is here. It is also the list of approved
libraries — reach for something outside it and the answer is to argue for it there
first.

## Getting started

Prerequisite: [bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`

```bash
bun install
cp .env.example .env      # then fill in VITE_API_URL
bun run dev               # http://localhost:5173
```

| Variable                | Required | Purpose                                                  |
| ----------------------- | -------- | -------------------------------------------------------- |
| `VITE_API_URL`          | yes      | Base URL of the BullLedger API, no trailing slash        |
| `VITE_GOOGLE_CLIENT_ID` | no       | Google OAuth client id; sign-in stays hidden while unset |

`src/config/env.ts` validates both and throws at boot naming anything missing or
malformed. Nothing else in the codebase reads `import.meta.env`.

The client talks to the API's real origin in development — **there is no dev proxy** —
so cross-origin cookies, credentialed CORS, and CSRF behave exactly as they do in
production, and a mistake in any of them surfaces on your machine rather than after a
deploy.

## How authentication works

Worth knowing before reading any of the code, because it drives a lot of it:

- The session is a pair of **httpOnly JWT cookies**. JavaScript cannot read them, so
  there is no token to store or attach — the browser does it.
- Auth status is therefore **server state, not client state**: `GET /api/auth/user/`
  answering 200 or 401 _is_ the answer, cached under one query key and read through
  `useCurrentUser()`.
- **Acquiring a CSRF token is a startup step.** The API refuses cookie-authenticated
  writes without one and hands it out from a single endpoint, so `main.tsx` asks at boot
  and every unsafe request awaits the same acquisition.
- Protection is **structural**: `/app` and everything under it sit behind one guarded
  layout route, so no page repeats the check.

## Tests

```bash
bun run check     # lint + format:check + typecheck + unit/component tests
bun run test      # Vitest only            bun run test:watch
bun run test:e2e  # Playwright — see below
```

Unit and component tests run against **MSW**, never the network: the real axios client
runs unmodified while the request layer is intercepted, so the tests assert on the
client's behaviour rather than on a mock's shape.

### End-to-end tests

Playwright specs live in `e2e/`, one file per user journey. They run against a **real
API and a real database** — a mocked E2E would prove nothing this suite exists to prove.

Playwright starts the Vite dev server itself; **do not start one for it.** The API is a
manual prerequisite, and _how_ you start it matters: the specs read emailed verification
and reset keys out of its console output, so that output has to reach
`.e2e-mailbox/api.log`.

In one terminal, leave the API running:

```bash
mkdir -p .e2e-mailbox                   # from this repo, once
cd ../BullLedgerAPI
PYTHONUNBUFFERED=1 uv run python manage.py runserver 8000 --noreload \
  2>&1 | tee ../BullLedgerWeb/.e2e-mailbox/api.log
```

In another, from this repo:

```bash
bun run test:e2e
```

An API started any other way runs the app fine but leaves no mailbox, and the four specs
that follow an emailed link fail with `No API mailbox at …`.

Check once that the API side is set up for it:

| Requirement                                 | Why                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Migrations applied                          | The specs write. `uv run python manage.py migrate`                   |
| `EMAIL_BACKEND` left at the console default | The mailbox _is_ the API's stdout                                    |
| `FRONTEND_URL=http://localhost:5173`        | Emailed links must land on the SPA, and the specs assert they do     |
| `VITE_API_URL=http://localhost:8000`        | Or export `E2E_API_URL` to match whatever the dev server booted with |

Two constraints that look like quirks and are not:

- **The suite runs one worker at a time.** Not because specs share state — each brings a
  user nobody else uses — but because the development database is SQLite, which takes a
  single writer: concurrent registrations answer `database is locked` with a 500.
- **Google sign-in is stubbed at the SDK boundary.** Its consent screen needs a human, so
  the spec replaces the Google Identity Services script and says so at the top of the
  file. The client half runs for real; the code exchange and provisioning stay covered by
  the API's own tests.

`docs/runbook.md` has the rest, including why the mailbox cannot live under
`test-results/`.

## Project layout

```
src/
├── assets/       # Static files imported by components
├── components/   # Reusable UI; ui/ is shadcn-generated, never hand-edited
├── config/       # env validation and app-wide constants
├── forms/        # TanStack Form field compositions
├── guards/       # Route protection (beforeLoad functions)
├── hooks/        # Shared hooks
├── i18n/         # react-i18next setup and en/pt locale JSON
├── lib/          # axios, CSRF, session recovery, query client
├── mocks/        # MSW handlers and test server
├── pages/        # One component per route
├── routes/       # Route tree and PATHS — no path is ever written inline
├── schemas/      # Zod schemas shared by forms, params, and API boundaries
├── services/     # API calls and ENDPOINTS, one file per domain
├── store/        # Zustand slices, for interactive UI state only
├── types/        # api.d.ts, generated from the OpenAPI schema — never hand-written
└── utils/        # Pure helpers: money, decimals, dates, formatting
e2e/              # Playwright specs, plus support/ for shared machinery
```

Tests sit in a `tests/` folder beside their subject. `docs/structure.md` is the full
version, including where a new file goes and why.

## Working on this repo

- **API types are generated, never written.** `bun run api:sync` pulls the live OpenAPI
  schema and regenerates `src/types/api.d.ts`; both artifacts are committed so lint,
  typecheck, and tests stay hermetic. The schema is authoritative over every document in
  `docs/`.
- **UI work goes through the `impeccable` skill** (`.claude/rules/ui-changes.md`). Any
  component, page, layout, or style change runs inside that flow; routing, services,
  schemas, hooks, i18n JSON, tests, and config are edited normally.
- **`docs/backend/` is mirrored from the API repository** and is not committed here —
  it is regenerated by a script on that side.
- Run `bun run check` before pushing. CI runs it alongside `bun run build` and a
  schema-drift job on every push.

## Documentation

| Document                                 | What it answers                                               |
| ---------------------------------------- | ------------------------------------------------------------- |
| [`docs/runbook.md`](docs/runbook.md)     | Install, run, verify, build, regenerate types, add an env var |
| [`docs/stack.md`](docs/stack.md)         | Which libraries are approved, and why each was chosen         |
| [`docs/structure.md`](docs/structure.md) | Where a new file goes                                         |
| [`PRODUCT.md`](PRODUCT.md)               | Users, brand, design principles, and the WCAG 2.1 AA bar      |
