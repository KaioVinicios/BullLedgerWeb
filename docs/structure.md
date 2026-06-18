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
Generic, reusable UI components that are not tied to a specific page or business domain (e.g. `DataTable`, `Modal`, `Avatar`). The `ui/` subfolder is managed by shadcn — do not edit those files manually.

### `config/`
Centralizes environment variables and app-wide constants so components never read `import.meta.env` directly.

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
Configuration and thin wrappers around third-party libraries (TanStack Query client, Axios instance, etc.). Not business logic — just setup code.

### `pages/`
One file (or folder) per route. Page components compose smaller components and hooks but contain no reusable logic of their own.

### `routes/`
TanStack Router route definitions. The route tree and lazy-loaded route files live here. Keep routing config separate from page UI.

### `schemas/`
Zod schemas used for form validation and API response parsing. Shared schemas (e.g. `addressSchema`) live here; schemas used only in one form can stay colocated.

### `services/`
Functions that call the API, one file per domain (e.g. `services/transactions.ts`). No UI logic, no state — just fetch/mutate calls that return typed data.

### `store/`
Zustand store slices, one file per domain (e.g. `store/auth.ts`). Keep stores thin: derived state belongs in selectors or hooks, not in the store itself.

### `types/`
Shared TypeScript interfaces and type aliases that are used across multiple modules. Types specific to a single file stay colocated.

### `utils/`
Pure functions with no side effects: formatters, parsers, date helpers, math. No React, no API calls.
