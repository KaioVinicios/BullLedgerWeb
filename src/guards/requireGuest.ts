import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { PATHS } from "@/routes/path";
import { currentUserQuery } from "@/services/auth";

interface GuardContext {
  context: { queryClient: QueryClient };
}

/**
 * The mirror of `requireAuth`: keeps a signed-in user off login and register.
 *
 * The two guards call the same `ensureQueryData` rather than sharing a helper
 * that returns a boolean, because their intent is opposite and worth reading
 * literally at the call site — this one redirects on *success* and does
 * nothing on failure, since a 401 is the welcome case here.
 */
export async function requireGuest({ context }: GuardContext) {
  try {
    await context.queryClient.ensureQueryData(currentUserQuery);
  } catch {
    return;
  }

  throw redirect({ to: PATHS.APP });
}
