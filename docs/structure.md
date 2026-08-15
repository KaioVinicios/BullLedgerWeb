<!-- v1.2.0 | last changed 2026-08-05 -->

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

`PageContainer` is where a screen's width is decided, and the only place a width belongs. Three values: `full` (the default — the content region *is* the measure, for tables, projections, and dashboards), `form` (the content has an optimal measure of its own, for forms, settings, and prose), and `form-wide` (a form that reads *beside* something — the target form sets a live summary panel next to its fields, and the pair needs more than the form measure without becoming a full-width table screen). Wrap the whole screen including its `PageHeader`, so the heading and its action share the content's edge. A capped column is centred: the screen stays one block — title over the input it introduces — and the leftover room reads as framing on both sides instead of a long void down the right. `full` gets no centring class, because its content already is the region and the class would only be a no-op.

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

`TargetStatusBadge.tsx` is one file for four verdicts, the same reason `signedTone.ts` is
one file: the vocabulary for a state belongs in one place, so the word for `BEHIND` is the
same word on the holding detail and on the overview row. The label is always rendered —
`PRODUCT.md` forbids encoding financial state by colour alone, and the icon is decorative
beside it rather than a substitute for it. The phase spends **one tone**: three verdicts
take the neutral `outline` variant and only `BELOW_FLOOR` takes `destructive`, which is the
incumbent pair already used elsewhere rather than a new colour this phase introduced. That
pair's measured contrast is still unrecorded; the file says so rather than implying it was
checked.

`TargetSentence.tsx` is the layout half of `utils/targetSentence.ts`, and it decides layout
and weight only — every word arrives pre-built. Two shapes: `line` for the list card (the
rungs and the floor joined, scope omitted because the card's title already names it) and
`stacked` for the form's summary panel (the scope as a sentence, then one row per rung with
the figure carrying the weight and the qualifier deferring to it). Two of the three
surfaces, not three: the holding's target block composes its one line straight from
`describeTarget` and `summarizeClauses`, because it sets that prose inside a larger sentence
of its own and has no layout for this file to decide. The rows are deliberately **not** a
`<dl>` — that would make `−3% monthly` the term and `floor` its definition, announcing every
value before the label it answers to — so they are plain elements grouped and labelled by
the scope sentence above them, under an id from `useId` rather than a literal one.

`AllocationBar.tsx` is decorative **by design and marked as such**: it is
`aria-hidden`, carries no text, and every label, value, and weight lives in the
table beside it, so no category is ever distinguishable by fill alone. Two
things about it were measured rather than eyeballed and are recorded in the
file: adjacent steps of the gold ramp sit at 1.40–1.68:1, far under the 3:1
non-text bar, so the segment boundary is a 2px gap rather than a colour
difference; and `--chart-1` at 1.20:1 over the light trough is excluded, because
a segment nobody can see is not a segment.

`InstitutionLogo.tsx` renders the mark the user recorded on an institution, wherever the
institution is named: the institutions and accounts tables, both holdings groupings, and
the institution's own edit header. It composes the Radix avatar primitive directly rather
than reusing `ui/avatar`, which crops to a circle with `object-cover` — right for a face
and wrong for a brand, since a wordmark loses its ends that way. Two decisions are worth
keeping: the tile is `aria-hidden` because the name is always beside it and an `alt` would
make every row say the institution twice; and the image sits on a constant white ground
while the initials fallback stays in the neutral ramp, because a third-party logo is
usually dark ink on transparency and would vanish in the dark theme, whereas initials have
no such problem and should not brighten a row that has no logo at all.

`BrandLink.tsx` is the brand in the one place it is defined, and it has two call sites for a
reason. The sidebar header carries it from `md` up; below `md` the sidebar is an off-canvas
sheet and takes the mark off screen with it, so `AppHeader` carries it there instead, behind
a rule that stands in for the rail's right border. Both sides of that switch key off the same
768px — `useIsMobile`'s query and Tailwind's `md` — so the brand is never absent and never
doubled. The file also owns the reason it is a plain anchor rather than a `Link`: `Link`
spreads `aria-current="page"` last when its target matches, and the brand points at `/app`, a
prefix of every screen.

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
ten enum fields must not invent its aria plumbing ten times), and the four numeric ones
below. All of them keep their value a **string** in form state and convert only at submit —
`parseMoneyInput` to integer minor units, Big.js for the percent's ÷100, `parseDecimalInput`
for the rest — so the money path never touches a float between the keyboard and the wire.
A unit (`BRL`, `%`) rides beside the input as a non-interactive marker: it is part of
reading the value, not of typing it.

**The four numeric fields, and why they are four.** No page declares `inputMode` or filters
a keystroke itself; a numeric field that is not one of these is a numeric field somebody
will forget to wire.

| Field | Types like | For |
|---|---|---|
| `MoneyField` | Cents mask, 2 places | Amounts, fees, balances |
| `PercentField` | Cents mask, 2 places | Rates and fees |
| `DecimalField` | Free, grouped live, `scale` prop | Quantities, unit prices, FX rates |
| `IntegerField` | Free, grouped live, no separator | Counts |

The split is forced by scale, not by taste. A currency's minor digits are fixed, which is
what makes filling from the right exact; a quantity carries eighteen decimal places and a
unit price twelve, so the same mask would read `10` as 1e-17 rather than ten shares.

`PercentField` holds the one conditional. Its mask is narrower than the wire, which permits
six decimal places as a percent, so an instance handed more precision than two places types
freely instead — decided once from the initial value, never flipping under the cursor. That
keeps opening a record and saving it from rounding a stored rate away.

**Anything handed to a masked field must already carry `MASK_PLACES` decimals.** This is the
easiest rule here to break by accident, and breaking it is silent: a rate prefilled as `6.5`
looks right, and then the first keystroke reads it as the digits `65` and lands on `0.65`,
dividing a stored figure by ten. Padding costs nothing, because `6.5` and `6.50` shift to
the same fraction. The prefills are already funnelled — `fractionToPercent` for every
percent in the app, `minorUnitsToDecimalString` for money — so a new one should go through
those rather than format a value itself. `localizeDecimal`'s default of zero minimum
fraction digits is what makes a hand-rolled prefill get this wrong; pass `MASK_PLACES` when
the destination is a masked field.

`hooks/useNumericInput.ts` is the shared behaviour and `utils/numericInput.ts` the
arithmetic beneath it, kept pure and DOM-free because the caret math is the part most likely
to be wrong and is far cheaper to pin as a function of `(string, index)`. That module also
owns `separatorsFor`, which `money.ts` and `decimal.ts` each held a byte-identical private
copy of until a third caller made the drift worth pre-empting.

It also decides whether a change is a keystroke or a whole number arriving at once, which is
not a nicety: read as keystrokes, a pasted `1.5` becomes `0.15`. A single inserted character
is a keystroke even when it replaced a selection; anything longer, and anything that changes
the length by more than one, is a paste — which is also how Playwright's `fill()` arrives.

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

`Sales/` renders the sales history — every lot that has been sold from, and what it
returned. A sibling of `Holding/` rather than a replacement: that screen answers what a
position is worth now, this one what a contribution returned when it was disposed of.

`Targets/` loads **once, not three times**. The screen used to run a paged query per level;
it now fetches every target at every level up front, plus every asset and every account,
because the shadow note on any one card has to compare it against levels the reader is not
looking at — a note that can only be drawn from data three sections away cannot be drawn by
a section that loaded only its own page. So the three sections take rows already in hand and
cut them locally with `slicePage`, and the three URL page parameters survived the change
unaltered: `?holdingPage=2` still means the second fifty of the holding level, still
independent of the other two, and still bookmarkable. What changed is only what the number
indexes — a local slice rather than a request. The whole screen goes pending and errors
together now, which is why `ScopeSection` carries `aria-busy` rather than three sections
each announcing their own load.

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

`targetsList.ts` holds the targets screen's URL state, and carries **three** page
parameters — `holdingPage`, `accountPage`, `portfolioPage` — where every other list in the
app has one. That is the cost of the three-section layout, paid rather than dodged: a single
shared `page` would step all three lists together, which is not a thing anyone means. Still
three, and still for that reason, but they no longer name three requests — the screen loads
every target at once and each parameter now indexes a local `slicePage` cut. The addresses
did not change with the loading, so a bookmarked `?accountPage=2` still lands where it did.
It also holds `newTargetSearchSchema`,
the prefill the holding detail links with; every field there is `.catch(undefined)`, so a
hand-edited URL degrades to an empty form rather than to a crash.

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

`targets.ts` types the create body as a **union over `scope`** — the schema's own shape,
three members carrying different coordinates — while the update body is a union of three
*structurally identical* members carrying no scope at all. That asymmetry is the contract
saying a target for a different scope is a different target, and it is why the edit screen
renders scope as a badge rather than as a control: there is no field to send.

`listAllTargetsInScope` walks every page rather than reading page 1, and the difference
matters. `GET /api/targets/` filters by `scope` only; `account` and `asset` are accepted and
**silently ignored**. The create form has to know whether an exact scope is already taken
before it offers a submit, and a page-1 answer would be confidently wrong the moment a user
owns 51 targets — the Phase 8 contribution-limits trap, which was survivable there because
a missing limit is visible and is not here, because a missing collision looks exactly like
no collision. `docs/backend-requests/2026-08-04-targets.md` asks for the filters; the walk
comes out when they land. It now takes `includeArchived`, and `targetsInScopeQuery` keys on
it — two populations, two cache entries. Folding them into one key would serve the
unarchived set to a reader who had just asked to see the archived rows, which is the archive
toggle appearing to do nothing.

`assets.ts` and `accounts.ts` carry the same walk, as `listAllAssets` / `allAssetsQuery` and
`listAllAccounts` / `allAccountsQuery`, and for a related reason: the targets screen resolves
an asset id to a name *and* to an archetype, and a page-1 answer would mis-resolve both the
moment a user owns 51 of either. A missing name shows a UUID, which is visibly wrong; a
missing archetype drops a shadow note, which looks exactly like no conflict. **Both walks
include archived rows** — a target can name an archived asset or an archived account and
still has to be readable.

`invalidateTargets` sweeps `PORTFOLIO_KEY` alongside the target keys, and that line is
asserted by a test rather than trusted. A target changes no *figure* the projections
carry — only the derived verdict beside them — so nothing on screen would look wrong if it
were dropped.

`profile.ts` is the one resource that is a singleton — `/api/profile/` carries no id and always resolves to the caller's own profile — so it defines its key inline instead of through `createResourceKeys`, which would give it a `list()` and a `detail()` that can never be called. The identity write (`updateCurrentUser`) lives in `auth.ts` beside `currentUserQuery` rather than in its own module, because it is the same resource; splitting a read from its write is how a client ends up with two disagreeing ideas of what a user is.

`sales.ts` is the fourth read-only projection, keyed under `PORTFOLIO_KEY` like the rest of
`portfolio.ts`. `profit_rate` arrives as a decimal-string fraction — the same convention
every other rate in this app follows — so nothing on this side divides or converts it.

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

`targetWire.ts` is `movementWire.ts`'s twin for targets, and the differences are the
interesting part. Where the ledger's conversion is about **sign**, this one is about
**shape**: the form holds one flat object for every scope and `toTargetRequest` picks the
union member at the wire, so choosing the wrong level and choosing back does not discard
what was typed. `from_month` is the one honest `Number()` on this path — `int64`, a count
of whole months, not money. `validateFormValues` exists because a `null` from the
conversion would otherwise be a submit button that does nothing, which is the Phase 5
`issuer` defect; it keys its refusals **exactly as the server keys its own**
(`steps.0.rate`), so client and server errors render through one path. Three facts the live
walk settled are recorded where the code reads them: the floor is a positive magnitude,
`PATCH` with `steps` replaces the array, and duplicate months are rejected.

`targetScope.ts` answers the three questions a target's scope raises — what it is called,
whether a half-filled selection is answerable yet, and whether an existing target already
occupies it. Pure and React-free, taking `t` as an argument the way `translateServerErrors`
does, because the same target has to be called the same thing in the list, the archive
dialog, the create form, and the edit screen. A target carries **no name of its own**:
nothing on any member of the union is a label, so every name here is built from the scope.

`targetSentence.ts` is one description of a target, for the three surfaces that describe
one: the list card, the form's live summary panel, and the holding's target block. Pure and
taking `t` as an argument, for `targetScope.ts`'s reason — three components writing their
own prose is three descriptions of the same target, drifting apart one copy change at a
time. It returns **clauses rather than a string** because the summary panel gives the figure
typographic weight and the qualifier none, and a single string cannot be split that way
without `<Trans>`, a pattern this project uses nowhere; each rung comes back as `{ rate,
when }` plus the two already joined as `text`, and the join itself is a translatable key, so
a locale needing qualifier-first order can have it. `describeMonths` is exported separately
because the ladder editor captions a row as soon as its **month** is readable, which is
before its rate is. Every number printed is a number the user typed: there is no derived
ordinal anywhere, so no field and the prose beside it can disagree by one.

`targetShadow.ts` answers which more-specific targets cover part of a broader one's reach —
**part**, and the copy beside it says so. `business-rules.md` takes the first matching level
whole, so a portfolio Crypto default still governs every crypto holding that no narrower
target names; reporting that as a conflict would be the hierarchy working, described as a
fault. It takes an `archetypeOf` lookup rather than the asset list, so it never has to know
what an `Asset` is, and an **unknown archetype never matches**: a note invented from a cache
miss would be worse than one that arrives a frame late. An archived target neither shadows
nor is shadowed.

`slicePage.ts` cuts a page out of an array already in hand, at the same `PAGE_SIZE` the
server pages by — so a bookmarked `?holdingPage=2` lands on the rows it used to. The targets
screen needs it because that screen loads every target at once (the shadow note has to
compare levels the reader is not looking at), and asking the server for page 2 of something
already downloaded would be a request that buys nothing. It **clamps**: a page past the end
is a hand-edited URL or a row removed under the reader, and both read better as the last
real page than as an empty list beside a live "previous" button.

`decimal.ts` gained the percent↔fraction pair (`percentToFraction`, `fractionToPercent`,
`localizeDecimal`). The ÷100 shift now has one home rather than a copy per form — it was
written once in `AssetForm` and would have been written a second time in `TargetForm`,
which is the moment a shared rule stops being a coincidence. It goes through Big, never a
float, like everything else on the money path.

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
