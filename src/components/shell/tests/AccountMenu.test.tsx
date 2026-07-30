import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

// A function, not a shared value: MSW consumes each Response body once, and
// this mock answers it to more than one request.
const unauthorized = () =>
  HttpResponse.json(
    {
      status: 401,
      message: "Authentication credentials were not provided.",
      errors: { detail: ["Authentication credentials were not provided."] },
    },
    { status: 401 },
  );

function mount() {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ["/app"] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient };
}

/** Opens the menu the way a user does, and returns nothing but the wait. */
async function openMenu() {
  await userEvent.click(
    await screen.findByRole("button", { name: user.email }),
  );
}

/**
 * A stateful "who am I" mock: authenticated until logout is called, then not
 * — the same way the real API's cookie stops working once it is cleared.
 * A handler that stays 200 forever would hide the real bug this flow has to
 * get right: the `/login` guard re-checks auth status, and if the mock never
 * reflects the logout, it bounces straight back to `/app`.
 */
function statefulSession(logoutStatus: 200 | 500) {
  let loggedOut = false;

  server.use(
    http.get(`${TEST_API_URL}/api/auth/user/`, () =>
      loggedOut ? unauthorized() : HttpResponse.json(user),
    ),
    http.post(`${TEST_API_URL}/api/auth/token/refresh/`, unauthorized),
    http.post(`${TEST_API_URL}/api/auth/logout/`, () => {
      loggedOut = true;
      return logoutStatus === 200
        ? HttpResponse.json({ detail: "Successfully logged out." })
        : HttpResponse.json({ status: 500, message: "boom" }, { status: 500 });
    }),
  );
}

describe("the account menu", () => {
  it("signs the user out and returns them to login", async () => {
    statefulSession(200);

    const { router, queryClient } = mount();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("menuitem", { name: app.accountMenu.logout }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
    expect(queryClient.getQueryData(["auth", "user"])).toBeUndefined();
  });

  it("signs out locally even when the logout request fails", async () => {
    statefulSession(500);

    const { router } = mount();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("menuitem", { name: app.accountMenu.logout }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });

  it("reaches profile, both preference groups, and logout", async () => {
    statefulSession(200);
    mount();

    await openMenu();

    expect(
      await screen.findByRole("menuitem", { name: app.accountMenu.profile }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: app.accountMenu.theme }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: app.accountMenu.language }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: app.accountMenu.logout }),
    ).toBeInTheDocument();
  });
});
