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

/** The accessible name a legal link carries: label plus its new-tab warning. */
const termsName = `${app.footer.legal.terms} (${app.footer.newTab})`;

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

  return screen.findByRole("navigation", { name: app.footer.label });
}

describe("AppSidebarFooter", () => {
  it("carries its own landmark, separate from the primary navigation", async () => {
    const footer = await mountAt(PATHS.APP);

    expect(
      screen.getByRole("navigation", { name: app.sidebar.label }),
    ).not.toBe(footer);
  });

  it("renders both product destinations", async () => {
    const footer = await mountAt(PATHS.APP);

    for (const label of Object.values(app.footer.links)) {
      expect(
        within(footer).getByRole("link", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("marks a footer destination as current when you are on it", async () => {
    const footer = await mountAt(PATHS.HELP);

    expect(
      within(footer).getByRole("link", { name: app.footer.links.help }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens each legal document in a new tab, safely", async () => {
    const footer = await mountAt(PATHS.APP);

    const terms = within(footer).getByRole("link", { name: termsName });

    expect(terms).toHaveAttribute("href", PATHS.TERMS);
    expect(terms).toHaveAttribute("target", "_blank");
    // Without noopener the opened page gets a handle on this window.
    expect(terms.getAttribute("rel")).toContain("noopener");
  });

  it("warns about the new tab in a name a screen reader can hear", async () => {
    const footer = await mountAt(PATHS.APP);

    // There is no visual glyph — this text is the whole affordance, so its
    // absence would be silent rather than obvious.
    expect(
      within(footer).getByRole("link", { name: termsName }),
    ).toBeInTheDocument();
  });

  it("shows a build stamp, outside the landmark", async () => {
    const footer = await mountAt(PATHS.APP);

    // Vitest always runs with DEV true, so this is the development branch.
    // `buildStamp`'s own tests cover the other two.
    const stamp = screen.getByText(app.footer.versionDev);

    expect(stamp).toBeInTheDocument();
    expect(footer).not.toContainElement(stamp);
  });
});
