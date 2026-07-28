import { QueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/apiError";

/** Only a genuinely transient failure is worth sending again. */
const RETRYABLE_KINDS: ReadonlySet<string> = new Set(["network", "server"]);

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        // A check-in should not show yesterday's number.
        refetchOnWindowFocus: true,
        // Never retry a 400 (it re-sends a wrong payload) or a 401
        // (the session-recovery interceptor has already handled it).
        retry: (failureCount, error) =>
          error instanceof ApiClientError &&
          RETRYABLE_KINDS.has(error.kind) &&
          failureCount < 2,
      },
      mutations: {
        // Re-sending a ledger write that may have succeeded is worse than
        // failing loudly.
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
