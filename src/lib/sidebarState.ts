/**
 * Reading back the collapse state shadcn's `SidebarProvider` writes.
 *
 * The generated provider sets a `sidebar_state` cookie on every toggle and
 * never reads it: upstream, a server reads the cookie and hands the value to
 * `defaultOpen`. A SPA has no server to do that, so without this the cookie is
 * written on every toggle and ignored on every reload — the sidebar would
 * spring back open each time.
 */
export const SIDEBAR_COOKIE_NAME = "sidebar_state";

export function readSidebarOpen(fallback = true): boolean {
  if (typeof document === "undefined") return fallback;

  const prefix = `${SIDEBAR_COOKIE_NAME}=`;
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));

  if (!entry) return fallback;

  return entry.slice(prefix.length) === "true";
}
