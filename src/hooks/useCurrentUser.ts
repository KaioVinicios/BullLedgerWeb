import { useQuery } from "@tanstack/react-query";

import { currentUserQuery } from "@/services/auth";

/**
 * Who is signed in, read from the server and cached — never mirrored into a
 * client store. The JWT lives in an httpOnly cookie that JavaScript cannot
 * read, so `GET /api/auth/user/` answering 200 or 401 *is* the auth status.
 *
 * `isAuthenticated` is derived from `isSuccess` rather than from the presence
 * of `data`, so a stale cached user left over from a query that has since
 * failed cannot read as signed in.
 */
export function useCurrentUser() {
  const query = useQuery(currentUserQuery);

  return {
    user: query.data,
    isAuthenticated: query.isSuccess,
    isLoading: query.isLoading,
  };
}
