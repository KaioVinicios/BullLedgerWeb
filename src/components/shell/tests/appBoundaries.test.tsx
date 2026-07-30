import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import common from "@/i18n/locales/en/common.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { createAppRouter } from "@/routes/router";
import { PATHS } from "@/routes/path";

const SECRET = "connection reset by peer at 10.0.0.4:5432";

// The one route this suite makes fail. Mocking the page module rather than
// inventing a throwing route keeps the assertion on the real tree: the error
// has to travel through the same boundary the app actually wires up.
vi.mock("@/pages/Accounts", () => ({
  AccountsPage: () => {
    throw new Error(SECRET);
  },
}));

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

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

beforeEach(() => {
  server.use(
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
  );
});

describe("an unknown authenticated route", () => {
  it("renders the app's own not-found surface, not the public one", async () => {
    const router = mount("/app/nowhere");

    expect(await screen.findByText(app.notFound.title)).toBeVisible();

    // The discriminator, and the reason this assertion is not the title:
    // `common.notFound.title` is the same sentence, and the root fallback
    // renders into this same Outlet — so a title match alone passes whether
    // or not `appRoute` carries a notFoundComponent of its own. The recovery
    // link is what differs: "Back to overview" here, "Back home" there.
    expect(
      screen.getByRole("link", { name: app.notFound.action }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: common.notFound.backHome }),
    ).not.toBeInTheDocument();

    // The shell survived: not a blank page, and not a logout.
    expect(
      screen.getByRole("navigation", { name: app.sidebar.label }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/app/nowhere");
  });
});

describe("a screen that throws", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React and TanStack both log the thrown error; this suite throws on
    // purpose, so the noise is expected rather than a signal.
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders the error surface inside the shell, without the payload", async () => {
    mount(PATHS.ACCOUNTS);

    expect(await screen.findByText(app.error.title)).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: app.sidebar.label }),
    ).toBeInTheDocument();

    // What went wrong is the console's business, never the user's.
    expect(screen.queryByText(new RegExp(SECRET))).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: app.error.retry }),
    ).toBeInTheDocument();
  });

  it("logs the real error so it is not simply swallowed", async () => {
    mount(PATHS.ACCOUNTS);
    await screen.findByText(app.error.title);

    // `vi.spyOn`'s return type widens the recorded arguments away, so the
    // shape is asserted here rather than inferred.
    const calls = consoleError.mock.calls as unknown[][];
    const logged = calls.some((call) =>
      call.some((arg) => arg instanceof Error && arg.message === SECRET),
    );
    expect(logged).toBe(true);
  });
});
