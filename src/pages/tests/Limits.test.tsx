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
import type { ContributionLimit } from "@/services/contributionLimits";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const limits: ContributionLimit[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    registration: "CA_TFSA",
    year: 2026,
    limit: { amount: 700_000, currency: "CAD" },
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    registration: "CA_RRSP",
    year: 2026,
    limit: { amount: 3_231_000, currency: "CAD" },
  },
];

function signedIn(rows: ContributionLimit[] = limits) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/contribution-limits/`, () =>
      HttpResponse.json({
        status: 200,
        data: {
          count: rows.length,
          next: null,
          previous: null,
          results: rows,
        },
      }),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json({
        status: 200,
        data: { count: 0, next: null, previous: null, results: [] },
      }),
    ),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json({
        status: 200,
        data: { count: 0, next: null, previous: null, results: [] },
      }),
    ),
  ];
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

  return { router, queryClient };
}

describe("the contribution limits screen", () => {
  it("lists the limits by registration and year", async () => {
    server.use(...signedIn());
    mount(PATHS.ACCOUNTS_LIMITS);

    const row = await screen.findByRole("row", {
      name: new RegExp(app.enums.registration.CA_TFSA),
    });

    expect(within(row).getByText("2026")).toBeVisible();
    expect(within(row).getByText("CA$7,000.00")).toBeVisible();
  });

  it("offers no sortable header, because no ordering parameter exists", async () => {
    server.use(...signedIn());
    mount(PATHS.ACCOUNTS_LIMITS);

    await screen.findByRole("row", {
      name: new RegExp(app.enums.registration.CA_TFSA),
    });

    // The same rule the ledger and the pricing list follow: a control that
    // cannot work is not offered.
    for (const header of screen.getAllByRole("columnheader")) {
      expect(within(header).queryByRole("button")).toBeNull();
    }
  });

  it("offers no way to write anything", async () => {
    server.use(...signedIn());
    mount(PATHS.ACCOUNTS_LIMITS);

    await screen.findByRole("row", {
      name: new RegExp(app.enums.registration.CA_TFSA),
    });

    // Scoped to the content region: the shell's own chrome (sidebar rail,
    // account menu) is not this screen's affordance. Reference data carries no
    // create, no edit, and no archive toggle of its own.
    const main = screen.getByRole("main");
    expect(within(main).queryAllByRole("button")).toHaveLength(0);
    expect(within(main).queryAllByRole("link")).toHaveLength(0);
  });

  it("says so rather than rendering an empty table", async () => {
    server.use(...signedIn([]));
    mount(PATHS.ACCOUNTS_LIMITS);

    expect(await screen.findByText(app.limits.empty.title)).toBeVisible();
  });

  it("ranks above the sibling $id route rather than editing an account named 'limits'", async () => {
    server.use(...signedIn());
    const { router } = mount(PATHS.ACCOUNTS_LIMITS);

    await screen.findByRole("row", {
      name: new RegExp(app.enums.registration.CA_TFSA),
    });

    expect(router.state.location.pathname).toBe("/app/accounts/limits");
  });

  it("is reachable from the accounts screen", async () => {
    server.use(...signedIn());
    mount(PATHS.ACCOUNTS);

    expect(
      await screen.findByRole("link", { name: app.accounts.seeLimits }),
    ).toHaveAttribute("href", PATHS.ACCOUNTS_LIMITS);
  });
});
