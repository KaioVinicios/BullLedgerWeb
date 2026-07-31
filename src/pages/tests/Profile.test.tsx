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
import { PORTFOLIO_KEY } from "@/services/queryKeys";

const user = {
  pk: 1,
  email: "ana@example.com",
  first_name: "Ana",
  last_name: "",
};

const profile = {
  id: "6f1c0e6e-0000-4000-8000-000000000000",
  reporting_currency: "BRL",
  inflation_reference_country: "BR",
};

// Built the same way the component builds them, so the tests assert on the
// rendered label without hard-coding a string Intl owns.
const currencyLabel = (code: string) =>
  `${code} — ${new Intl.DisplayNames("en-US", { type: "currency" }).of(code)}`;

const countryLabel = (code: string, index: string) =>
  `${new Intl.DisplayNames("en-US", { type: "region" }).of(code)} — ${index}`;

/** Both reads the screen depends on, answered the way the API answers them. */
function signedIn() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/profile/`, () =>
      HttpResponse.json({ status: 200, data: profile }),
    ),
  ];
}

/** The screen carries two named forms; every query scopes to one of them. */
function identityForm() {
  return screen.findByRole("form", { name: app.profile.identity.title });
}

function reportingForm() {
  return screen.findByRole("form", { name: app.profile.reporting.title });
}

function mount() {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [PATHS.PROFILE] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient };
}

describe("the Account card", () => {
  it("shows the signed-in address without offering to change it", async () => {
    server.use(...signedIn());
    mount();

    // Scoped to the screen: the account menu in the shell header also renders
    // the address, so an unscoped query would pass without the card existing.
    const main = within(await screen.findByRole("main"));

    expect(await main.findByText(user.email)).toBeVisible();
    // Read-only on the schema, so there must be no input for it — a disabled
    // field would say "not yet" when the truth is "not from this screen".
    expect(
      main.queryByLabelText(app.profile.identity.email),
    ).not.toBeInTheDocument();
  });

  it("keeps Save unavailable until something actually changes", async () => {
    server.use(...signedIn());
    mount();

    const account = within(await identityForm());

    const save = account.getByRole("button", {
      name: app.profile.actions.save,
    });
    expect(save).toBeDisabled();

    await userEvent.type(
      account.getByLabelText(app.profile.identity.lastName),
      "Ribeiro",
    );

    expect(save).toBeEnabled();
  });

  it("restores the server's values on Discard", async () => {
    server.use(...signedIn());
    mount();

    const account = within(await identityForm());

    const lastName = account.getByLabelText(app.profile.identity.lastName);
    await userEvent.type(lastName, "Ribeiro");

    await userEvent.click(
      account.getByRole("button", { name: app.profile.actions.discard }),
    );

    expect(lastName).toHaveValue("");
  });

  it("saves the name and leaves every figure alone", async () => {
    let sent: unknown;
    server.use(
      ...signedIn(),
      http.patch(`${TEST_API_URL}/api/auth/user/`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...user, last_name: "Ribeiro" });
      }),
    );

    const { queryClient } = mount();

    // A projection already in the cache. The point of this test is that it is
    // still there, untouched, afterward: the invalidation rule for the
    // portfolio is deliberately coarse, and coarse rules drift toward
    // invalidating everything on every mutation. A surname moves no figure.
    queryClient.setQueryData([...PORTFOLIO_KEY, "overview"], { total: 1 });

    const account = within(await identityForm());

    await userEvent.type(
      account.getByLabelText(app.profile.identity.lastName),
      "Ribeiro",
    );
    await userEvent.click(
      account.getByRole("button", { name: app.profile.actions.save }),
    );

    await waitFor(() =>
      expect(sent).toEqual({ first_name: "Ana", last_name: "Ribeiro" }),
    );

    expect(
      queryClient.getQueryState([...PORTFOLIO_KEY, "overview"])?.isInvalidated,
    ).toBe(false);
  });

  it("lands a server field error on the input that produced it", async () => {
    server.use(
      ...signedIn(),
      http.patch(`${TEST_API_URL}/api/auth/user/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { first_name: ["This field may not be blank."] },
            codes: { first_name: ["blank"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount();

    const account = within(await identityForm());

    await userEvent.type(
      account.getByLabelText(app.profile.identity.lastName),
      "Ribeiro",
    );
    await userEvent.click(
      account.getByRole("button", { name: app.profile.actions.save }),
    );

    const firstName = account.getByLabelText(app.profile.identity.firstName);
    await waitFor(() =>
      expect(firstName).toHaveAttribute("aria-invalid", "true"),
    );
    expect(
      account.getByText("This field may not be blank."),
    ).toBeInTheDocument();
  });
});

describe("the Reporting card", () => {
  it("arrives showing what the server holds", async () => {
    server.use(...signedIn());
    mount();

    expect(
      await screen.findByRole("radio", { name: currencyLabel("BRL") }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: countryLabel("BR", "IPCA") }),
    ).toBeChecked();
  });

  it("says the change is a lens, and says it to assistive technology too", async () => {
    server.use(...signedIn());
    mount();

    const group = await screen.findByRole("radiogroup", {
      name: app.profile.reporting.currency,
    });

    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      app.profile.reporting.lens,
    );
  });

  it("saves the preference and re-reads every projection", async () => {
    let sent: unknown;
    server.use(
      ...signedIn(),
      http.patch(`${TEST_API_URL}/api/profile/`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          status: 200,
          data: { ...profile, reporting_currency: "USD" },
        });
      }),
    );

    const { queryClient } = mount();
    queryClient.setQueryData([...PORTFOLIO_KEY, "overview"], { total: 1 });

    await userEvent.click(
      await screen.findByRole("radio", { name: currencyLabel("USD") }),
    );
    await userEvent.click(
      within(await reportingForm()).getByRole("button", {
        name: app.profile.actions.save,
      }),
    );

    await waitFor(() =>
      expect(sent).toEqual({
        reporting_currency: "USD",
        inflation_reference_country: "BR",
      }),
    );

    // Every figure in the app is read through this preference, so the whole
    // projection root goes stale together rather than field by field.
    await waitFor(() =>
      expect(
        queryClient.getQueryState([...PORTFOLIO_KEY, "overview"])
          ?.isInvalidated,
      ).toBe(true),
    );
  });

  it("sends null when the user asks for no real return", async () => {
    let sent: Record<string, unknown> | undefined;
    server.use(
      ...signedIn(),
      http.patch(`${TEST_API_URL}/api/profile/`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          status: 200,
          data: { ...profile, inflation_reference_country: null },
        });
      }),
    );

    mount();

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.profile.reporting.noInflation,
      }),
    );
    await userEvent.click(
      within(await reportingForm()).getByRole("button", {
        name: app.profile.actions.save,
      }),
    );

    await waitFor(() =>
      expect(sent).toHaveProperty("inflation_reference_country", null),
    );
  });

  it("lands a server field error on the group that produced it", async () => {
    server.use(
      ...signedIn(),
      http.patch(`${TEST_API_URL}/api/profile/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { reporting_currency: ['"USD" is not a valid choice.'] },
            codes: { reporting_currency: ["invalid_choice"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount();

    await userEvent.click(
      await screen.findByRole("radio", { name: currencyLabel("USD") }),
    );
    await userEvent.click(
      within(await reportingForm()).getByRole("button", {
        name: app.profile.actions.save,
      }),
    );

    expect(
      await screen.findByText('"USD" is not a valid choice.'),
    ).toBeInTheDocument();
  });
});
