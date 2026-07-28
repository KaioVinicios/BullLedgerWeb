import type { QueryClient } from "@tanstack/react-query";

import { PATHS } from "@/routes/path";
import type { AppRouter } from "@/routes/router";

/**
 * Lives in `routes/` rather than `lib/` because ending a session is partly a
 * navigation decision, and `lib/` must not know about routes. Dependencies are
 * passed in rather than imported as singletons, so both behaviours are
 * testable against a memory-history router.
 */

/**
 * Ends the session locally: every cached figure belongs to the user who just
 * left, so the whole cache goes, not only the auth key.
 *
 * `returnTo` is omitted for a deliberate sign-out — bouncing someone back to
 * where they were is the right answer for an expired session and the wrong one
 * for a person who just asked to leave.
 */
export async function endSession(
  queryClient: QueryClient,
  router: AppRouter,
  returnTo?: string,
): Promise<void> {
  queryClient.clear();
  await router.navigate({
    to: PATHS.LOGIN,
    search: returnTo ? { redirect: returnTo } : {},
  });
}

/** True for `/app` itself and anything nested under it, but not `/apple`. */
function isProtected(pathname: string): boolean {
  return pathname === PATHS.APP || pathname.startsWith(`${PATHS.APP}/`);
}

/**
 * What happens when a refresh fails — the transport layer's way of saying the
 * session is gone for good.
 *
 * A user sitting still on a protected page gets no `beforeLoad` re-run, so
 * without this they would watch the cache empty underneath them and nothing
 * would move. On a public page the same 401 means something different: an
 * anonymous visitor asking "who am I" and being told "nobody" has no session
 * to lose, and redirecting them would turn a question into a punishment.
 */
export function handleSessionLost(
  queryClient: QueryClient,
  router: AppRouter,
): void {
  const { pathname, href } = router.state.location;

  if (!isProtected(pathname)) {
    queryClient.clear();
    return;
  }

  void endSession(queryClient, router, href);
}
