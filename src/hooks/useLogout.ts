import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { endSession } from "@/routes/endSession";
import { logout } from "@/services/auth";

/**
 * Signs the user out.
 *
 * `onSettled` rather than `onSuccess`: if the POST fails — the network is
 * down, or the session had already expired — the user still asked to leave.
 * Clearing locally and returning them to login is the honest outcome; leaving
 * them staring at a populated ledger they no longer have a session for is not.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSettled: () => endSession(queryClient, router),
  });
}
