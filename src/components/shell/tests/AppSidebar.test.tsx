import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

async function mountAt(path: string) {
  server.use(
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
  );

  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return screen.findByRole("navigation", { name: app.sidebar.label });
}

describe("AppSidebar", () => {
  it("renders every navigable area", async () => {
    const nav = await mountAt(PATHS.APP);

    for (const label of Object.values(app.nav)) {
      expect(
        within(nav).getByRole("link", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("marks the current area, and only it", async () => {
    const nav = await mountAt(PATHS.ACCOUNTS);

    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(app.nav.accounts);
  });

  it("does not leave Overview current on a child route", async () => {
    // /app is a prefix of every screen, and activeOptions.exact defaults to
    // false — this is the regression that flag exists to prevent.
    const nav = await mountAt(PATHS.LEDGER);

    expect(
      within(nav).getByRole("link", { name: app.nav.overview }),
    ).not.toHaveAttribute("aria-current");
  });

  it.each([PATHS.APP, PATHS.ACCOUNTS, PATHS.HELP])(
    "lets exactly one element in the whole shell claim %s as current",
    async (path) => {
      await mountAt(path);

      // Deliberately not scoped to the nav landmark: the assertion above is,
      // and that is precisely why it could not see the brand mark claiming
      // `aria-current` from the sidebar header. `Link` sets that attribute
      // whenever its target matches and spreads it last, so the brand — which
      // points at /app, a prefix of everything — is a plain anchor instead.
      const claiming = document.querySelectorAll("[aria-current='page']");

      expect(claiming).toHaveLength(1);
      expect(claiming[0]).toBeInstanceOf(HTMLAnchorElement);
    },
  );
});
