// Single source of truth for route paths. `as const` keeps the literal
// types so TanStack Router can still type-check `<Link to>` and `path`
// against the route tree.
//
// No PUBLIC/PROTECTED prefixes here: protection and URL composition come
// from the route tree itself — a layout route (e.g. path "/app" with a
// beforeLoad auth guard) prefixes and protects all of its children.
// Params use TanStack segments (e.g. "/verify-email/$uid/$token") and are
// passed via the `params` prop, not string interpolation.
export const PATHS = {
  HOME: "/",
  DESIGN_SYSTEM: "/design-system",
} as const;
