import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { PATHS } from "@/routes/path";
import { currentUserQuery } from "@/services/auth";

interface GuardContext {
  context: { queryClient: QueryClient };
  location: ParsedLocation;
}

/**
 * Blocks a protected route until the session is known.
 *
 * `ensureQueryData` resolves from cache when data is already there, so
 * navigating around the app costs no extra request. A session revoked
 * server-side therefore passes this guard once — and then the first real API
 * call 401s, the transport layer attempts its refresh, and the session-lost
 * path takes over. The guard is the fast path; transport is the backstop.
 *
 * Any rejection counts as unauthenticated, which fails closed: a network blip
 * sends the user to login rather than into a screen that cannot load.
 */
export async function requireAuth({ context, location }: GuardContext) {
  try {
    await context.queryClient.ensureQueryData(currentUserQuery);
  } catch {
    throw redirect({
      to: PATHS.LOGIN,
      search: { redirect: location.href },
    });
  }
}
