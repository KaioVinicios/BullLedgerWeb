import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const signedIn = http.get(`${TEST_API_URL}/api/auth/user/`, () =>
  HttpResponse.json(user),
);

const signedOut = [
  http.get(`${TEST_API_URL}/api/auth/user/`, () =>
    HttpResponse.json(
      {
        status: 401,
        message: "Authentication credentials were not provided.",
        errors: { detail: ["Authentication credentials were not provided."] },
      },
      { status: 401 },
    ),
  ),
  http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
    HttpResponse.json({}, { status: 401 }),
  ),
];

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

  return router;
}

describe("requireAuth", () => {
  it("sends an unauthenticated visitor to login carrying where they meant to go", async () => {
    server.use(...signedOut);

    const router = mount("/app");

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toMatchObject({ redirect: "/app" });
  });

  it("lets a signed-in user through", async () => {
    server.use(signedIn);

    const router = mount("/app");

    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
  });
});

describe("requireGuest", () => {
  it("keeps a signed-in user off the login page", async () => {
    server.use(signedIn);

    const router = mount("/login");

    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
  });

  it("leaves an unauthenticated visitor on the login page", async () => {
    server.use(...signedOut);

    const router = mount("/login");

    await waitFor(() => expect(router.state.isLoading).toBe(false));
    expect(router.state.location.pathname).toBe("/login");
  });
});
