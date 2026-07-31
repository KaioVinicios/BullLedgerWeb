import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
import { REGISTRATIONS_BY_COUNTRY } from "@/schemas/apiEnums";
import type { Account } from "@/services/accounts";
import type { Institution } from "@/services/institutions";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const nubank: Institution = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  name: "Nubank",
  kinds: ["BANK"],
  country: "BR",
  is_self_custody: false,
  archived_at: null,
};

const tfsa: Account = {
  id: "2b3c4d5e-6f70-4182-9394-a5b6c7d8e9f0",
  institution: nubank.id,
  name: "Wealthsimple TFSA",
  country: "CA",
  registration: "CA_TFSA",
  base_currency: "CAD",
  account_number: "",
  contribution_room: null,
  plan_type: null,
  deductible: null,
  tax_regime: null,
  taxed_on: null,
  archived_at: null,
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function handlers() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(page([nubank])),
    ),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([tfsa])),
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

describe("the accounts list", () => {
  it("labels rows with registration and institution name", async () => {
    server.use(...handlers());
    mount(PATHS.ACCOUNTS);

    expect(await screen.findByText("Wealthsimple TFSA")).toBeVisible();
    expect(screen.getByText(app.enums.registration.CA_TFSA)).toBeVisible();
    expect(await screen.findByText("Nubank")).toBeVisible();
    expect(screen.getByText("CAD")).toBeVisible();
  });
});

describe("the account form", () => {
  it("offers only the selected country's registrations — an invalid pairing is unofferable", async () => {
    server.use(...handlers());
    mount(PATHS.ACCOUNTS_NEW);

    // BR is the default country: its three registrations and nobody else's.
    for (const code of REGISTRATIONS_BY_COUNTRY.BR) {
      expect(
        await screen.findByRole("radio", {
          name: app.enums.registration[code],
        }),
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("radio", { name: app.enums.registration.CA_TFSA }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: app.enums.registration.US_401K }),
    ).not.toBeInTheDocument();

    // Switching to Canada swaps the whole set and resets the selection.
    await userEvent.click(screen.getByRole("radio", { name: "Canada" }));

    expect(
      await screen.findByRole("radio", {
        name: app.enums.registration.CA_TFSA,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", {
        name: app.enums.registration.BR_PREV_PGBL,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("radio", {
        name: app.enums.registration.CA_NON_REGISTERED,
      }),
    ).toBeChecked();
  });

  it("moves the base currency to the country's, as a default not a lock", async () => {
    server.use(...handlers());
    mount(PATHS.ACCOUNTS_NEW);

    const currency = (code: string) =>
      screen.getByRole("radio", {
        name: `${code} — ${new Intl.DisplayNames("en-US", { type: "currency" }).of(code)}`,
      });

    // Found live: a Canadian TFSA sat denominated in Brazilian real, because
    // nothing followed the country.
    expect(await screen.findByRole("radio", { name: "Brazil" })).toBeChecked();
    expect(currency("BRL")).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Canada" }));
    await waitFor(() => expect(currency("CAD")).toBeChecked());

    await userEvent.click(screen.getByRole("radio", { name: "United States" }));
    await waitFor(() => expect(currency("USD")).toBeChecked());

    // A default, not a lock: the user can still keep US books in CAD.
    await userEvent.click(currency("CAD"));
    expect(currency("CAD")).toBeChecked();
    expect(screen.getByRole("radio", { name: "United States" })).toBeChecked();
  });

  it("reveals the account-level advantage note and room only for US/CA wrappers", async () => {
    server.use(...handlers());
    mount(PATHS.ACCOUNTS_NEW);

    // BR taxable: instrument-level note, no contribution room.
    expect(
      await screen.findByText(app.accounts.form.instrumentAdvantageNote),
    ).toBeVisible();
    expect(
      screen.queryByLabelText(app.accounts.form.contributionRoom),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Canada" }));
    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.registration.CA_TFSA }),
    );

    expect(
      await screen.findByText(app.accounts.form.accountAdvantageNote),
    ).toBeVisible();
    expect(
      screen.getByLabelText(app.accounts.form.contributionRoom),
    ).toBeVisible();
    expect(
      screen.queryByText(app.accounts.form.instrumentAdvantageNote),
    ).not.toBeInTheDocument();
  });

  it("reveals the Previdência hybrid's own tax fields", async () => {
    server.use(...handlers());
    mount(PATHS.ACCOUNTS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.registration.BR_PREV_PGBL,
      }),
    );

    expect(
      await screen.findByRole("switch", {
        name: app.accounts.form.deductible,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: app.enums.taxRegime.REGRESSIVE }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: app.enums.taxedOn.GAINS_ONLY }),
    ).toBeInTheDocument();
  });

  it("submits the hybrid's fields, and nulls for what does not apply", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...handlers(),
      http.post(`${TEST_API_URL}/api/accounts/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: { ...tfsa, id: crypto.randomUUID() } },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.ACCOUNTS_NEW);

    await userEvent.type(
      await screen.findByLabelText(app.accounts.form.name),
      "Prev XP",
    );
    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.registration.BR_PREV_VGBL }),
    );
    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.taxRegime.REGRESSIVE,
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.accounts.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ACCOUNTS),
    );
    expect(posted).toMatchObject({
      name: "Prev XP",
      country: "BR",
      registration: "BR_PREV_VGBL",
      institution: null,
      plan_type: "VGBL",
      deductible: false,
      tax_regime: "REGRESSIVE",
      // Room belongs to US/CA wrappers; a BR_PREV account sends null.
      contribution_room: null,
    });
  });

  it("parses contribution room into integer minor units, never a float", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...handlers(),
      http.post(`${TEST_API_URL}/api/accounts/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: { ...tfsa, id: crypto.randomUUID() } },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.ACCOUNTS_NEW);

    await userEvent.type(
      await screen.findByLabelText(app.accounts.form.name),
      "My TFSA",
    );
    await userEvent.click(screen.getByRole("radio", { name: "Canada" }));
    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.registration.CA_TFSA }),
    );
    // The currency followed the country; no click needed to reach CAD.
    await waitFor(() =>
      expect(
        screen.getByRole("radio", {
          // Built the way the component builds it, so the assertion never
          // hard-codes a string Intl owns.
          name: `CAD — ${new Intl.DisplayNames("en-US", { type: "currency" }).of("CAD")}`,
        }),
      ).toBeChecked(),
    );
    await userEvent.type(
      await screen.findByLabelText(app.accounts.form.contributionRoom),
      "7,000.50",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.accounts.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ACCOUNTS),
    );
    expect(posted).toMatchObject({
      registration: "CA_TFSA",
      contribution_room: { amount: 700050, currency: "CAD" },
    });
  });

  it("edits with the loader's values and PATCHes the change", async () => {
    let patched: Record<string, unknown> | undefined;

    server.use(
      ...handlers(),
      http.get(`${TEST_API_URL}/api/accounts/${tfsa.id}/`, () =>
        HttpResponse.json({ status: 200, data: tfsa }),
      ),
      http.patch(
        `${TEST_API_URL}/api/accounts/${tfsa.id}/`,
        async ({ request }) => {
          patched = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 200,
            data: { ...tfsa, name: "TFSA main" },
          });
        },
      ),
    );

    const { router } = mount(PATHS.ACCOUNTS_EDIT.replace("$id", tfsa.id));

    expect(
      await screen.findByRole("heading", { level: 1, name: tfsa.name }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: app.enums.registration.CA_TFSA }),
    ).toBeChecked();

    const name = screen.getByLabelText(app.accounts.form.name);
    await userEvent.clear(name);
    await userEvent.type(name, "TFSA main");
    await userEvent.click(
      screen.getByRole("button", { name: app.accounts.form.save }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ACCOUNTS),
    );
    expect(patched).toMatchObject({ name: "TFSA main", country: "CA" });
  });
});
