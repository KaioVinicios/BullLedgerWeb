import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Institution } from "@/services/institutions";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const nubank: Institution = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  name: "Nubank",
  kinds: ["BANK", "BROKERAGE"],
  country: "BR",
  is_self_custody: false,
  archived_at: null,
};

const coldWallet: Institution = {
  id: "1f2e3d4c-5b6a-4798-8695-a4b3c2d1e0f9",
  name: "Cold wallet",
  kinds: ["EXCHANGE"],
  country: "US",
  is_self_custody: true,
  archived_at: "2026-07-01T12:00:00Z",
};

function page(results: Institution[], count = results.length) {
  return {
    status: 200,
    data: { count, next: null, previous: null, results },
  };
}

function signedIn() {
  return http.get(`${TEST_API_URL}/api/auth/user/`, () =>
    HttpResponse.json(user),
  );
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

describe("the institutions list", () => {
  it("renders the rows the API answered with", async () => {
    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(page([nubank])),
      ),
    );

    mount(PATHS.INSTITUTIONS);

    expect(await screen.findByText("Nubank")).toBeVisible();
    expect(screen.getByText(app.enums.kind.BANK)).toBeVisible();
    expect(screen.getByText(app.enums.kind.BROKERAGE)).toBeVisible();
    expect(screen.getByText("Brazil")).toBeVisible();
    // One page of one row: the pager has nothing to say.
    expect(
      screen.queryByRole("navigation", {
        name: app.structure.pagination.label,
      }),
    ).not.toBeInTheDocument();
  });

  it("asks for archived rows only when the toggle asks, via the URL", async () => {
    const seen: Array<string | null> = [];

    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get("include_archived"));
        return HttpResponse.json(
          url.searchParams.get("include_archived") === "true"
            ? page([nubank, coldWallet])
            : page([nubank]),
        );
      }),
    );

    const { router } = mount(PATHS.INSTITUTIONS);

    await screen.findByText("Nubank");
    expect(screen.queryByText("Cold wallet")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("switch", { name: app.structure.showArchived }),
    );

    expect(await screen.findByText("Cold wallet")).toBeVisible();
    // The row says archived in text, never only by styling.
    expect(screen.getByText(app.structure.archivedBadge)).toBeVisible();
    // The URL owns the state: reloading this address restores the view.
    expect(router.state.location.search).toMatchObject({
      include_archived: true,
    });
    expect(seen).toEqual([null, "true"]);
  });

  it("sorts by name through the ordering parameter, ascending then descending", async () => {
    const seen: Array<string | null> = [];

    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("ordering"));
        return HttpResponse.json(page([nubank]));
      }),
    );

    const { router } = mount(PATHS.INSTITUTIONS);
    await screen.findByText("Nubank");

    const nameHeader = screen.getByRole("button", {
      name: app.institutions.columns.name,
    });

    await userEvent.click(nameHeader);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ ordering: "name" }),
    );

    await userEvent.click(nameHeader);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ ordering: "-name" }),
    );

    await waitFor(() => expect(seen).toEqual([null, "name", "-name"]));
  });

  it("names the next action when there is nothing yet", async () => {
    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(page([])),
      ),
    );

    mount(PATHS.INSTITUTIONS);

    expect(await screen.findByText(app.institutions.empty.title)).toBeVisible();
    // Two doors to the same room: the header action and the empty state's.
    const links = screen.getAllByRole("link", { name: /Add institution/ });
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("archives through the confirmation dialog, worded as archival", async () => {
    let archived = false;

    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(archived ? page([]) : page([nubank])),
      ),
      http.post(
        `${TEST_API_URL}/api/institutions/${nubank.id}/archive/`,
        () => {
          archived = true;
          return HttpResponse.json({
            status: 200,
            data: { ...nubank, archived_at: "2026-07-31T12:00:00Z" },
          });
        },
      ),
    );

    mount(PATHS.INSTITUTIONS);
    await screen.findByText("Nubank");

    await userEvent.click(
      screen.getByRole("button", {
        name: app.structure.openMenu.replace("{{name}}", "Nubank"),
      }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: app.structure.archive }),
    );

    const dialog = await screen.findByRole("alertdialog");
    // The copy promises survival, not deletion.
    expect(
      within(dialog).getByText(app.structure.archiveDialog.description),
    ).toBeVisible();

    await userEvent.click(
      within(dialog).getByRole("button", {
        name: app.structure.archiveDialog.confirm,
      }),
    );

    await waitFor(() => expect(archived).toBe(true));
    await waitFor(() =>
      expect(screen.queryByText("Nubank")).not.toBeInTheDocument(),
    );
  });
});

describe("the institution form", () => {
  it("creates from the New screen and returns to the list", async () => {
    let posted: unknown;

    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(page([nubank])),
      ),
      http.post(`${TEST_API_URL}/api/institutions/`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { status: 201, data: nubank },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.INSTITUTIONS_NEW);

    await userEvent.type(
      await screen.findByLabelText(app.institutions.form.name),
      "Nubank",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: app.enums.kind.BANK }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.institutions.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.INSTITUTIONS),
    );
    expect(posted).toMatchObject({
      name: "Nubank",
      kinds: ["BANK"],
      country: "BR",
      is_self_custody: false,
    });
  });

  it("pre-validates: no name and no kind never reach the wire", async () => {
    let requested = false;

    server.use(
      signedIn(),
      http.post(`${TEST_API_URL}/api/institutions/`, () => {
        requested = true;
        return HttpResponse.json({ status: 201, data: nubank });
      }),
    );

    mount(PATHS.INSTITUTIONS_NEW);

    await userEvent.click(
      await screen.findByRole("button", {
        name: app.institutions.form.create,
      }),
    );

    expect(
      await screen.findByText(app.institutions.form.errors.name),
    ).toBeVisible();
    expect(screen.getByText(app.institutions.form.errors.kinds)).toBeVisible();
    expect(requested).toBe(false);
  });

  it("lands a server field error on the field that caused it", async () => {
    server.use(
      signedIn(),
      http.post(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { name: ["An institution with this name already exists."] },
            codes: { name: ["unique"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount(PATHS.INSTITUTIONS_NEW);

    await userEvent.type(
      await screen.findByLabelText(app.institutions.form.name),
      "Nubank",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: app.enums.kind.BANK }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.institutions.form.create }),
    );

    const nameInput = screen.getByLabelText(app.institutions.form.name);
    expect(
      await screen.findByText("An institution with this name already exists."),
    ).toBeVisible();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
  });

  it("edits with the loader's values and PATCHes the change", async () => {
    let patched: unknown;

    server.use(
      signedIn(),
      http.get(`${TEST_API_URL}/api/institutions/${nubank.id}/`, () =>
        HttpResponse.json({ status: 200, data: nubank }),
      ),
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(page([nubank])),
      ),
      http.patch(
        `${TEST_API_URL}/api/institutions/${nubank.id}/`,
        async ({ request }) => {
          patched = await request.json();
          return HttpResponse.json({
            status: 200,
            data: { ...nubank, name: "Nu" },
          });
        },
      ),
    );

    const { router } = mount(PATHS.INSTITUTIONS_EDIT.replace("$id", nubank.id));

    // The screen titles itself with the record's own name.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nubank" }),
    ).toBeVisible();

    const nameInput = screen.getByLabelText(app.institutions.form.name);
    expect(nameInput).toHaveValue("Nubank");
    expect(
      screen.getByRole("checkbox", { name: app.enums.kind.BANK }),
    ).toBeChecked();

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Nu");
    await userEvent.click(
      screen.getByRole("button", { name: app.institutions.form.save }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.INSTITUTIONS),
    );
    expect(patched).toMatchObject({ name: "Nu", kinds: ["BANK", "BROKERAGE"] });
  });
});
