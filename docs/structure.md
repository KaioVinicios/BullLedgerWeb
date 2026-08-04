<!-- v1.1.0 | last changed 2026-08-03 -->

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

`shell/` holds the authenticated application frame — sidebar, header, account menu, and the in-shell not-found and error surfaces. It is reusable chrome rather than any one route's page, which is why it lives here and not in `pages/`. Page-composition primitives shared by every screen (`PageHeader`, `EmptyState`, `PageSkeleton`, `PageContainer`) sit directly in `components/`: screens compose them, and the shell does not own them.

`PageContainer` is where a screen's width is decided, and the only place a width belongs. Two values: `full` (the default — the content region *is* the measure, for tables, projections, and dashboards) and `form` (the content has an optimal measure of its own, for forms, settings, and prose). Wrap the whole screen including its `PageHeader`, so the heading and its action share the content's edge. The column is left-aligned rather than centred on purpose: centring would move the content's left edge horizontally on every navigation between a narrow screen and a wide one, and a fixed left edge is worth more than symmetric whitespace.

The resource-list pattern lives here too, as four small pieces every structure screen
composes rather than a `ResourceTable` component that would have to grow a prop for every
difference: `ListPagination` (renders nothing on a single page), `ListSkeleton`,
`ListError`, and `ShowArchivedToggle`. `SortableColumnHeader` owns one `ordering` value and
cycles ascending → descending → the server's default, so the default order stays reachable
without editing the address bar. `ArchiveConfirmDialog` is the one confirmation all three
resources share — worded as archival, never deletion, and keeping the default button
variant rather than destructive red, because painting reversible tidying as destruction
would make the dialog argue with its own copy.

`signedTone.ts` is where a moved figure's presentation is decided, once.
`SignedFigure` renders signed Money and `SignedPercent` a signed decimal-string
rate; both read sign, tone, and screen-reader label from that one function, so a
gain reads identically whether it is an amount or a rate. Same reasoning as
`shell/activeStyles.ts` — the vocabulary for a state belongs in one file.

`AllocationBar.tsx` is decorative **by design and marked as such**: it is
`aria-hidden`, carries no text, and every label, value, and weight lives in the
table beside it, so no category is ever distinguishable by fill alone. Two
things about it were measured rather than eyeballed and are recorded in the
file: adjacent steps of the gold ramp sit at 1.40–1.68:1, far under the 3:1
non-text bar, so the segment boundary is a 2px gap rather than a colour
difference; and `--chart-1` at 1.20:1 over the light trough is excluded, because
a segment nobody can see is not a segment.

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

One field component per input shape, each the single owner of its label ↔ control ↔ hint ↔
error wiring: `TextField`, `PasswordField`, `SelectField` (the enum twin — a form stacking
ten enum fields must not invent its aria plumbing ten times), `MoneyField`, and
`PercentField`. The last two keep their value a **string** in form state and convert only
at submit — `parseMoneyInput` to integer minor units, Big.js for the percent's ÷100 — so
the money path never touches a float between the keyboard and the wire. Their unit (`BRL`,
`%`) rides beside the input as a non-interactive marker: it is part of reading the value,
not of typing it.

`serverErrors.ts` splits a rejection into per-field and form-level messages, and
`claimFieldErrors` is what keeps a message from landing nowhere. A form passes the field
names it renders; anything else — a key the API added, a rule the form has no input for —
moves to the form-level banner prefixed with the server's own key. It exists because the
Phase 5 live walk found a 400 keyed on `issuer` rendering into a void, which reads to the
user as a submit button that does nothing.

### `guards/`
Components or higher-order wrappers that protect routes. Works alongside TanStack Router's `beforeLoad` to redirect unauthenticated or unauthorized users.

Each guard is a `beforeLoad` function reading `context.queryClient` — the router carries the query client in its context, so a guard can resolve the session before the first protected render without any component having mounted. Guards share one `currentUserQuery` options object from `services/auth.ts`; they never define their own fetch, or the guard and the UI could disagree about who is signed in.

### `hooks/`
Custom React hooks shared across multiple pages or components. Hooks specific to a single component stay colocated with that component.

`useFormatLocale.ts` returns the BCP 47 tag every figure formats with, read through `useTranslation` so a language switch re-renders the figures rather than leaving them in the language the user just left. `MoneyValue`, `PercentValue`, and `SignedFigure` call it themselves and take `locale` only as an override — a required prop would tax Phase 8, which is almost entirely figures, with a value identical at every call site.

### `i18n/`
react-i18next initialization and all translation files organized by language and namespace.

`formatLocale.ts` maps each interface language to the tag `Intl` formats with (`en → en-US`, `pt → pt-BR`). Like `language.ts` it must stay side-effect free, because Playwright imports it in Node. It is a fixed map rather than `navigator.language` so the same language always formats identically across the browser, Vitest, and Playwright — reading the browser's region would make every locale-sensitive assertion depend on a setting the test has to pin first.

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

`movementTypes.ts` is **captured, not authored** — the real `GET /api/movement-types/`
payload from a running API, committed so every test filters, reveals, and signs against the
same table the server validates with. A hand-written fixture would be the client restating
the matrix again, which is the thing the endpoint was requested to remove; the
`MovementTypeSpec[]` annotation is the guard that stops it compiling if the server's shape
drifts. Recapture it whenever that table changes.

`env.ts` holds `TEST_API_URL`, the origin every test runs against. `vite.config.ts` imports it to set `VITE_API_URL`, and handlers build their URLs from it, so the two can never drift. It is the one file here that application config imports, which is why it must stay dependency-free — `vite.config.ts` reaches it by relative path, before the `@/` alias exists.

### `pages/`
One file (or folder) per route. Page components compose smaller components and hooks but contain no reusable logic of their own.

### `routes/`
TanStack Router route definitions. The route tree and lazy-loaded route files live here. Keep routing config separate from page UI.

`path.ts` carries two tables for the same reason it always did — TanStack composes a
child's path onto its parent's, so the tree needs bare segments while `<Link to>` needs
whole paths. `APP_CHILD_SEGMENTS` extends that to the create/edit trios, deriving each
child from its parent's segment so a renamed resource cannot leave its children behind, and
edit routes use a `$id` param rather than interpolation.

Two Phase 8 entries break the file's own symmetry, each for a stated reason.
`HOLDING_DETAIL` is written with a literal `holdings/` prefix rather than derived from an
`APP_SEGMENTS.HOLDINGS`, because there is no holdings index to derive from — the API
publishes no holdings-list endpoint, so a `PATHS.HOLDINGS` would be a typed, linkable path
resolving to not-found. `path.test.ts` exempts it by name and `appRoutes.test.tsx` pins
that `/app/holdings` really is nothing.

`APP_INDEX_ROUTE_ID` is exported beside `PATHS` and is deliberately not in it. TanStack
gives a layout route and its index child different ids — `/app` and `/app/` — and
`getRouteApi` resolves by id, so the overview must ask for the second. Passing `PATHS.APP`
silently resolves the *layout*, whose search schema is empty, and the screen reads `{}`
forever. It is not a destination, so `<Link to>` still uses `PATHS.APP`.

Each edit route resolves its record in a `loader` before the screen renders, sharing one
`queryOptions` object with the form — the reason `profileQuery` is shared by its loader and
its screen. A form that mounts empty and resets when data lands is where dirty-state bugs
live.

### `schemas/`
Zod schemas used for form validation and API response parsing. Shared schemas (e.g. `addressSchema`) live here; schemas used only in one form can stay colocated.

`apiEnums.ts` is the runtime half of the generated types. `src/types/api.d.ts` is
`type`-only, so a form rendering one input per enum value has nothing to iterate; this file
restates those values as arrays, and makes the restatement safe in both directions —
`satisfies` rejects a value the schema dropped, and an `AllOf` check rejects a list missing
one the schema gained. Two derived maps live here rather than in a component because they
*are* domain rules: `REGISTRATIONS_BY_COUNTRY`, which makes the invalid country↔wrapper
pairing in `business-rules.md` unofferable by construction, and `CURRENCY_BY_COUNTRY`,
which is a default and never a lock.

`movementSpec.ts` is derivation over a table the client **fetches** rather than declares —
the one place in `schemas/` that owns no data of its own. OpenAPI cannot express an
archetype × movement-type matrix in its type system, so the API publishes the table as data
at `GET /api/movement-types/`, and this file answers questions about it: which types an
asset may take, which shape each carries, whether it accepts a fee, a unit price, or a lot.
Every function takes the table as its first argument instead of reading a module-level copy,
which is what keeps it testable against a captured fixture with no network, no query client,
and no React. The one rule the table cannot express lives here too, and says so:
`quantityRequired` encodes the server's `movement_quantity_required`, which lets only a
lump-principal `FIXED_INCOME` position omit its units.

`COST_BASIS_METHOD_BY_COUNTRY` joins the two country-keyed maps above and is the
one rule in the file the **API does not publish**. `HoldingDetail` carries
`registration` and `tax_advantaged` but never the method, so the client states
what `business-rules.md` says: BR and CA compute a weighted average, the US
FIFO / specific-lot. A *statement*, never a computation — the basis figure is
always the server's. Being a copy of a document, it moves when that document
does.

`portfolioView.ts` holds the URL state for the three projection screens. Two
choices in it are worth knowing: the overview stores which account groups are
**closed** rather than which are open, because expanded is the resting state and
storing the open set would put every account id in the address bar on a screen
nobody has touched; and none of the three carries `on`, because all three
endpoints default the valuation date to today and a date picker would be a
product decision rather than a missing control.

`resourceList.ts` holds the URL search state every structure list shares. Every field is
optional in the *output* as well as the input, deliberately: a required output would force
a `search` prop onto every `<Link>` into a list screen, including the sidebar's. Absence
means the default, the read site applies `?? 1` / `?? false`, and `stripSearchParams` keeps
explicitly-written defaults out of the address bar so the two spellings of "resting state"
collapse into one URL.

### `services/`
Functions that call the API, one file per domain (e.g. `services/transactions.ts`). No UI logic, no state — just fetch/mutate calls that return typed data.

Every path lives in `services/endpoints.ts`, never inline at a call site — the same rule `src/routes/path.ts` applies to routes. Each call names its response type from `src/types/api.d.ts`, since axios cannot infer it from the schema:

```ts
export const listAccounts = (query: AccountListQuery) =>
  request(api.get<PaginatedAccountList>(ENDPOINTS.accounts, { params: query }));
```

A **list query's type comes from the operation**, never from a hand-written interface:
`operations["api_assets_list"]["parameters"]["query"]`. That is what makes a parameter the
schema does not declare unsendable, and one it gains available the moment types are
regenerated — the `archetype` filter and `ordering` entered the client that way, with no
service edit beyond the type alias.

**Archival is `POST /{id}/archive/`, not `DELETE`.** The dedicated endpoint answers with the
updated resource, and `unarchive` is its symmetric twin — an archived row the UI can show
but not restore is a dead end. The invalidation rule is one line per mutation: the
resource's own root always, plus `PORTFOLIO_KEY` when archiving an account or an asset,
because that changes what the projections aggregate. A rename does not touch projections;
they carry ids, and the names come from the resource cache that was just invalidated.

`movementTypes.ts` is the one query **not** built on `createResourceKeys`, and deliberately:
the server's spec table is static per deploy — it changes with a release, never with the
user's data — so it is fetched once per session under its own `["movement-types"]` key with
`staleTime: Infinity`. No mutation anywhere can invalidate it, which is exactly why it must
not sit under a resource root that `invalidateLedger` sweeps.

`portfolio.ts` holds all three read-only projections, two of which arrived ahead of the
phase that owns them: Phase 6 pulled `holdingQuery` forward to make the exit lot selector
honest — `/api/lots/` knows a lot's label and nothing else, while this carries each lot's
status and remainder, so an insolvent lot can be unofferable rather than merely rejected —
and Phase 7 pulled `overviewQuery` forward for `missing[]`. Everything here is keyed under
`PORTFOLIO_KEY`, so every ledger write, price write, and reporting-currency change already
invalidates it with no separate rule.

Two traps live in the shapes rather than in the code. The overview's `accounts[]` includes
an account with **no movements** (empty `holdings`, zero cash), so "is this portfolio
empty" reads the groups rather than the array's length — verified against a running API,
not assumed. And allocation's `by_archetype` is **not** the overview's `archetypes[]`: it
adds a sixth `FREE_CASH` bucket and types `key` as a bare string where the overview types
`archetype` as `ArchetypeEnum`, so the two look interchangeable in the generated types and
are not.

`contributionLimits.ts` is reference data and keys **outside** `PORTFOLIO_KEY`, for the
reason `movementTypes.ts` does: no user mutation can change it, so nothing should
invalidate it and it must not sit under a root `invalidateLedger` sweeps. Unlike that table
it is paginated, so it keeps the ordinary key factory with `staleTime: Infinity`. Its query
type declares neither `registration` nor `year` — the holding detail needs exactly one row
and can only ask for a page, which is why `findLimit` searches page 1 and returns
`undefined` rather than a nearest match. The filter is asked for in
`docs/backend-requests/2026-08-03-reporting.md`.

`movements.ts` is the ledger's write surface, and what it *lacks* is the schema's decision
rather than an omission: there is no update and no delete, because `/api/movements/{id}/`
is GET-only. A movement is an immutable fact, so correcting one is `replace` — which voids
the original and records a successor — and removing one is `void`. `isTransferLeg` lives
here because the answer is not the obvious field: the API pairs a transfer's legs
one-directionally, so the departing leg's own `transfer_of` is null and only the type
identifies both.

`profile.ts` is the one resource that is a singleton — `/api/profile/` carries no id and always resolves to the caller's own profile — so it defines its key inline instead of through `createResourceKeys`, which would give it a `list()` and a `detail()` that can never be called. The identity write (`updateCurrentUser`) lives in `auth.ts` beside `currentUserQuery` rather than in its own module, because it is the same resource; splitting a read from its write is how a client ends up with two disagreeing ideas of what a user is.

### `store/`
Zustand store slices, one file per domain (e.g. `store/auth.ts`). Keep stores thin: derived state belongs in selectors or hooks, not in the store itself.

### `types/`
Shared TypeScript interfaces and type aliases that are used across multiple modules. Types specific to a single file stay colocated.

`version.d.ts` declares the `__APP_VERSION__` global. It is a declaration rather than a module because Vite's `define` is a textual substitution — there is nothing to import from.

### `utils/`
Pure functions with no side effects: formatters, parsers, date helpers, math. No React, no API calls.

`allocation.ts` holds `weightToWidth`, and its comment draws a line worth keeping: the
result is **geometry, not money**. It lands in a `style.width` and never on screen as a
figure — every displayed percentage goes through `formatPercent`, which keeps the decimal
string intact all the way to `Intl`. It also clamps, because the server's weights are
fractions of the *computable* total and legitimately fall outside 0–1 (a portfolio that
bought before depositing returns a weight of `"5"` beside one of `"-4"`).

`movementWire.ts` is the single place the UI's language becomes the wire's. Every numeric
field in the ledger asks for a **magnitude** — "total paid", "units disposed" — and
`toMovementRequest` applies the sign the movement's shape requires, so no screen ever asks
a user for a negative number and no screen has to remember to negate one. It returns `null`
rather than a rounded guess when an amount cannot be held exactly, because passing
`parseMoneyInput`'s refusal through is the only honest option on the money path.

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
