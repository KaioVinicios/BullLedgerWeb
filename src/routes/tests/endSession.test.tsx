import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { endSession, handleSessionLost } from "@/routes/endSession";
import { TEST_API_URL } from "@/mocks/env";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

/**
 * A session that can be revoked mid-test.
 *
 * Ending a session and then leaving the server answering 200 would be a lie:
 * landing on /login re-runs `requireGuest`, which refetches, sees a valid
 * session, and bounces straight back to /app. That is correct behaviour
 * against a fiction. Revoking the session is what actually happens.
 */
function session() {
  const state = { valid: true };

  server.use(
    http.get(`${TEST_API_URL}/api/auth/user/`, () =>
      state.valid
        ? HttpResponse.json(user)
        : HttpResponse.json(
            {
              status: 401,
              message: "Authentication credentials were not provided.",
              errors: {
                detail: ["Authentication credentials were not provided."],
              },
            },
            { status: 401 },
          ),
    ),
    http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
      HttpResponse.json({}, { status: 401 }),
    ),
  );

  return state;
}

function mount(initialPath: string) {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient, router };
}

describe("endSession", () => {
  it("clears every cached query, not just the auth one", async () => {
    const state = session();

    const { queryClient, router } = mount("/app");
    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));

    queryClient.setQueryData(["accounts", "list", {}], { count: 1 });
    state.valid = false;

    await endSession(queryClient, router);

    expect(queryClient.getQueryData(["accounts", "list", {}])).toBeUndefined();
    expect(queryClient.getQueryData(["auth", "user"])).toBeUndefined();
  });

  it("lands on login with a clean URL, because leaving was deliberate", async () => {
    const state = session();

    const { queryClient, router } = mount("/app");
    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));

    state.valid = false;

    await endSession(queryClient, router);

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    // No `?redirect=` in the URL: someone who asked to leave should not be
    // bounced back to where they were on their next sign-in.
    expect(router.state.location.href).toBe("/login");
  });
});

describe("handleSessionLost", () => {
  it("returns a user to login carrying the page they were thrown out of", async () => {
    const state = session();

    const { queryClient, router } = mount("/app");
    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));

    state.valid = false;
    handleSessionLost(queryClient, router);

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toMatchObject({ redirect: "/app" });
  });

  it("leaves an anonymous visitor on a public page where they are", async () => {
    const { queryClient, router } = mount("/");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));

    handleSessionLost(queryClient, router);

    await waitFor(() => expect(router.state.isLoading).toBe(false));
    expect(router.state.location.pathname).toBe("/");
  });
});
