<!-- v1.0.0 | last changed 2026-06-17 -->

# Project Directory Structure

All application code lives under `src/`. The conventions below apply to every feature added to the project.

```
src/
├── assets/          # Static files: images, fonts, SVGs, icons
├── components/      # Reusable UI components, not tied to any route
│   └── ui/          # shadcn/ui primitives (auto-generated, do not edit manually)
├── config/          # App-wide constants, env variable abstraction, feature flags
├── contexts/        # React Context providers for cross-cutting concerns
├── forms/           # TanStack Form field compositions and form-level logic
├── guards/          # Route protection logic (auth, role, permissions)
├── hooks/           # Custom React hooks shared across features
├── i18n/            # react-i18next setup and locale JSON files
│   └── locales/
│       ├── en/
│       └── pt/
├── lib/             # Third-party library configs and wrappers (query client, axios, etc.)
│   └── tests/       # Unit and integration tests for lib/ — see "Tests" below
├── mocks/           # MSW request handlers and the test server
├── pages/           # Page-level components, one per route
├── routes/          # TanStack Router route definitions and tree
├── schemas/         # Zod schemas shared across forms and API boundaries
├── services/        # API call functions, one file per resource/domain
├── store/           # Zustand stores, one file per domain slice
├── types/           # Shared TypeScript interfaces and type aliases
└── utils/           # Pure utility functions (formatting, parsing, math, etc.)
```

## Directory Responsibilities

### `assets/`
Images, SVGs, fonts, and any static file imported directly into components.

### `components/`
Generic, reusable UI components that are not tied to a specific page or business domain (e.g. `DataTable`, `Modal`, `Avatar`). The `ui/` subfolder is managed by shadcn — do not edit those files manually, and where an edit is unavoidable, record it in a `LOCAL EDITS` comment at the top of the file so a regeneration knows what to reapply (`ui/sidebar.tsx` carries two).

`shell/` holds the authenticated application frame — sidebar, header, account menu, and the in-shell not-found and error surfaces. It is reusable chrome rather than any one route's page, which is why it lives here and not in `pages/`. Page-composition primitives shared by every screen (`PageHeader`, `EmptyState`, `PageSkeleton`) sit directly in `components/`: screens compose them, and the shell does not own them.

`AppSidebarFooter.tsx` is the sidebar's second landmark: the destinations that belong to the product rather than to the portfolio (Help, Feedback), the legal links, and the build stamp. The legal links are plain anchors opening the canonical public documents in a new tab, never mirrored under `/app`. `activeStyles.ts` holds the classes that say "current" — shared by the primary navigation and the footer, so the sidebar has one vocabulary for that state rather than two that drift.

**Adding a shadcn component:** run `bunx shadcn add <name>` and then check `git status`. The CLI resolves `components.json`'s `@/` aliases through `compilerOptions.paths`, and the root `tsconfig.json` is a solution file that carries none — so it writes to a literal `@/` directory at the repo root instead of `src/`. Move the files you wanted into place and delete `@/`. This is a safety net as much as a nuisance: several of the `ui/` files carry hand-tuned contrast fixes that a resolved overwrite would silently revert.

### `config/`
Centralizes environment variables and app-wide constants so components never read `import.meta.env` directly. `navigation.ts` is the sidebar's model — sections of `{ path, labelKey, icon }`, deliberately data rather than JSX so it can be asserted directly and rendered in a test without a router.

`version.ts` reads the build stamp `vite.config.ts` injects, and applies the same rule to it: the `__APP_VERSION__` global is read here and nowhere else. Its `buildStamp()` decides what to show — the short SHA in a production build, a "development build" note otherwise, and nothing at all when git was unreadable at build time. That decision lives in a function rather than in JSX so all three outcomes are testable; under Vitest `import.meta.env.DEV` is always true.

```ts
// config/env.ts
export const API_URL = import.meta.env.VITE_API_URL;
```

### `contexts/`
React Context providers for cross-cutting concerns that don't fit Zustand (e.g. theme, locale, modal state). Prefer Zustand for global app state — use Context when the value is tightly scoped to a subtree or when you need React's built-in reactivity without an external store.

### `forms/`
TanStack Form compositions: field components with built-in validation wiring, and reusable form sections. Business forms like `LoginForm` or `TransactionForm` live here.

### `guards/`
Components or higher-order wrappers that protect routes. Works alongside TanStack Router's `beforeLoad` to redirect unauthenticated or unauthorized users.

Each guard is a `beforeLoad` function reading `context.queryClient` — the router carries the query client in its context, so a guard can resolve the session before the first protected render without any component having mounted. Guards share one `currentUserQuery` options object from `services/auth.ts`; they never define their own fetch, or the guard and the UI could disagree about who is signed in.

### `hooks/`
Custom React hooks shared across multiple pages or components. Hooks specific to a single component stay colocated with that component.

### `i18n/`
react-i18next initialization and all translation files organized by language and namespace.

```
i18n/
├── index.ts          # i18next init
└── locales/
    ├── en/
    │   └── common.json
    └── pt/
        └── common.json
```

### `lib/`
Configuration and thin wrappers around third-party libraries (TanStack Query client, axios instance, etc.). Not business logic — just setup code.

`sidebarState.ts` reads back the collapse cookie shadcn's `SidebarProvider` writes but never reads — upstream a server reads it and passes `defaultOpen`, and a SPA has no server to do that.

The axios instance in `apiClient.ts` carries every transport concern: cookies, CSRF — token acquisition and per-method policy in `csrf.ts` — and, through `sessionRecovery.ts`, refreshing and replaying once on a 401. Nothing outside `lib/` calls axios directly.

### `mocks/`
MSW request handlers and the `setupServer` instance used by Vitest. Test-only — never imported by application code.

`env.ts` holds `TEST_API_URL`, the origin every test runs against. `vite.config.ts` imports it to set `VITE_API_URL`, and handlers build their URLs from it, so the two can never drift. It is the one file here that application config imports, which is why it must stay dependency-free — `vite.config.ts` reaches it by relative path, before the `@/` alias exists.

### `pages/`
One file (or folder) per route. Page components compose smaller components and hooks but contain no reusable logic of their own.

### `routes/`
TanStack Router route definitions. The route tree and lazy-loaded route files live here. Keep routing config separate from page UI.

### `schemas/`
Zod schemas used for form validation and API response parsing. Shared schemas (e.g. `addressSchema`) live here; schemas used only in one form can stay colocated.

### `services/`
Functions that call the API, one file per domain (e.g. `services/transactions.ts`). No UI logic, no state — just fetch/mutate calls that return typed data.

Every path lives in `services/endpoints.ts`, never inline at a call site — the same rule `src/routes/path.ts` applies to routes. Each call names its response type from `src/types/api.d.ts`, since axios cannot infer it from the schema:

```ts
export const listAccounts = (query: AccountListQuery) =>
  request(api.get<PaginatedAccountList>(ENDPOINTS.accounts, { params: query }));
```

### `store/`
Zustand store slices, one file per domain (e.g. `store/auth.ts`). Keep stores thin: derived state belongs in selectors or hooks, not in the store itself.

### `types/`
Shared TypeScript interfaces and type aliases that are used across multiple modules. Types specific to a single file stay colocated.

`version.d.ts` declares the `__APP_VERSION__` global. It is a declaration rather than a module because Vite's `define` is a textual substitution — there is nothing to import from.

### `utils/`
Pure functions with no side effects: formatters, parsers, date helpers, math. No React, no API calls.

## Tests

Tests live in a `tests/` folder inside the directory they cover, never beside the file under test.

```
src/utils/
├── tests/
│   ├── money.test.ts
│   └── trade.test.ts
├── money.ts
└── trade.ts
```

This keeps each directory's source listing free of test noise while leaving a test one level from its subject. Import the subject through the `@/` alias (`@/utils/money`), not a relative path — the alias survives a move, `../money` does not.

Test files end in `.test.ts` or `.test.tsx`. Vitest discovers them anywhere under `src/`, so no configuration changes when a new `tests/` folder appears.

Two things deliberately sit outside this rule:

- **`src/setupTests.ts`** — Vitest configuration, not a test. `vite.config.ts` points at it by path.
- **`e2e/`** — Playwright specs, at the repo root. Vitest is configured to exclude the directory so the two runners never collide.

  One file per user journey, named for the journey (`auth-register.spec.ts`) and not for the component it happens to exercise — the journeys themselves are listed in `docs/v1-e2e-todo.md`. Shared machinery lives in `e2e/support/`, which Playwright's default `testMatch` ignores, so nothing there is ever collected as a spec. `e2e/tsconfig.json` sits inside the directory rather than at the root because Playwright resolves path aliases from the tsconfig nearest the spec; the root one is a solution file carrying no compiler options.

  Specs may import from `src/` through the `@/` alias, and should: routes come from `PATHS`, endpoints from `ENDPOINTS`, and asserted copy from the shipped locale JSON. Only side-effect-free modules qualify — importing `@/i18n/config` would run `i18n.init()` in Node, which is why the two language constants live in `@/i18n/language`.
