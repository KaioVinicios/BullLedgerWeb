# Web Frontend Stack

React + TypeScript web frontend. Consumes the BullLedger REST API. Built partly as a vehicle to learn newer tooling, with a future native Swift (iOS/macOS) client in mind.

---

## Installation

### OS-level

These must be installed on the machine before working on the project.

| Tool | Purpose |
|---|---|
| **bun** | Runtime + package manager (install via `curl -fsSL https://bun.sh/install \| bash`) |

### Project-level (via `bun`)

Everything below is declared in `package.json` and installed with `bun install`.

| Package | Purpose |
|---|---|
| **react** + **react-dom** | UI library |
| **typescript** | Type safety |
| **vite** | Dev server + bundler |
| **tailwindcss** | Utility-first styling |
| **shadcn/ui** | Accessible component library (on top of Tailwind) |
| **@tanstack/react-form** | Headless, type-safe forms |
| **@tanstack/react-query** | Server state: caching, refetching, mutations |
| **@tanstack/react-router** | Type-safe routing + validated search params (Zod) |
| **zustand** | Interactive client UI state |
| **zod** | Schema validation (forms, API boundaries, router params) |
| **react-i18next** | Internationalization |
| **@react-oauth/google** | Google OAuth2 flow wrapper |
| **vitest** + **@testing-library/react** | Unit + component tests |
| **playwright** | E2E tests |
| **eslint** + **prettier** | Lint + format |

---

## Frontend — React

| Concern | Choice | Why |
|---|---|---|
| Core | **React + TypeScript + Vite** | Confirmed. Fast dev/build. |
| Styling | **Tailwind CSS + shadcn/ui** | Utility-first + composable accessible components. |
| Forms | **TanStack Form** | Headless, type-safe forms. |
| Server state | **TanStack Query** | Caching, refetching, mutations, optimistic updates. Most app "state" lives here, not in a client store. |
| Routing | **TanStack Router** | End-to-end type safety incl. **typed + validated search params** (Zod) — ideal for URL-driven table filters/pagination/sorting. Consistent with the rest of the TanStack stack; router loaders can prefetch Query data. |
| Client state | **Zustand + React Context** | Context for provider-level concerns (theme, app shell); Zustand for interactive UI state (toggles, wizards) with selective re-render. Note: auth status is **not** client state — it comes from a `/me` query (server state) because the JWT lives in an httpOnly cookie. |
| Validation | **Zod** | One source of truth for shape + types. Powers TanStack Form validation, API-boundary parsing, and router search-param schemas. |
| Package manager | **bun** | Fastest, modern. |
| Testing | **Vitest + React Testing Library** (unit/component), **Playwright** (E2E) | |
| Lint + format | **ESLint + Prettier** | Native fit with shadcn/ui ecosystem — no tooling friction. |
| i18n | **react-i18next** | Most widely adopted React i18n library. Handles namespaces, lazy loading of translation files, pluralization, and interpolation out of the box. |
| OAuth | **@react-oauth/google** | Lightweight Google OAuth2 wrapper for React. Triggers the OAuth flow and handles the callback; hands the token to the backend for exchange. |

---

## Stack at a Glance

React · TypeScript · Vite · Tailwind · shadcn/ui · TanStack Form · TanStack Query · TanStack Router · Zustand · React Context · Zod · react-i18next · @react-oauth/google · bun · Vitest · React Testing Library · Playwright · ESLint · Prettier
